mod db;
mod services;
mod commands;

use std::sync::{Arc, Mutex};
use tauri::Manager;
use log::info;

use crate::commands::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).ok();

            let db_path = app_data_dir.join("lightfeed.db");
            let conn = db::init_database(&db_path).expect("Failed to initialize database");

            let conn = Arc::new(Mutex::new(conn));
            app.manage(DbState(conn.clone()));

            // Start cleanup scheduler
            services::cleanup::start_cleanup_scheduler(conn.clone());

            // Start feed refresh scheduler
            let conn_for_scheduler = conn.clone();
            tauri::async_runtime::spawn(async move {
                // Initial refresh after 5 seconds
                tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                let service = services::feed_service::FeedService::new();
                let _ = service.refresh_all(&conn_for_scheduler).await;

                // Then every 30 minutes
                let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30 * 60));
                loop {
                    interval.tick().await;
                    let service = services::feed_service::FeedService::new();
                    let _ = service.refresh_all(&conn_for_scheduler).await;
                }
            });

            info!("LightFeed initialized");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::add_feed,
            commands::remove_feed,
            commands::remove_multiple_feeds,
            commands::list_feeds,
            commands::update_feed,
            commands::rename_feed,
            commands::refresh_all_feeds,
            commands::refresh_feed,
            commands::list_categories,
            commands::create_category,
            commands::rename_category,
            commands::delete_category,
            commands::reorder_category,
            commands::bulk_reorder_categories,
            commands::move_feed_to_category,
            commands::reorder_feed,
            commands::list_entries,
            commands::get_entry,
            commands::mark_read,
            commands::mark_all_read,
            commands::toggle_star,
            commands::get_unread_counts,
            commands::fetch_article_content_cmd,
            commands::export_opml,
            commands::import_opml,
            commands::get_setting,
            commands::set_setting,
            commands::open_external,
            commands::get_platform,
            commands::is_dev,
            commands::get_current_db_path,
            commands::get_default_db_path,
            commands::check_db_exists,
            commands::select_folder,
            commands::run_cleanup_now,
            commands::get_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
