use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use tauri::{AppHandle, Emitter, State};

use crate::db::models::*;
use crate::db::{feed as db_feed, category as db_cat, subscription as db_sub, entry as db_entry, settings as db_settings};
use crate::services::feed_service::{FeedService, fetch_article_content};
use crate::services::{cleanup, opml};

pub struct DbState(pub Arc<Mutex<Connection>>);

// --- Feed commands ---

#[tauri::command]
pub async fn add_feed(
    state: State<'_, DbState>,
    url: String,
    category_id: Option<String>,
) -> Result<serde_json::Value, String> {
    let conn = Arc::clone(&state.0);
    {
        let db = conn.lock().map_err(|e| e.to_string())?;
        if let Some(existing_id) = db_feed::get_feed_id_by_url(&db, &url).map_err(|e| e.to_string())? {
            db_sub::add_subscription(&db, &existing_id, category_id.as_deref()).map_err(|e| e.to_string())?;
            return Ok(serde_json::json!({"id": existing_id, "isNew": false}));
        }
    }

    let service = FeedService::new();
    let feed_id = service.add_and_subscribe(&conn, &url, category_id.as_deref()).await?;
    Ok(serde_json::json!({"id": feed_id, "isNew": true}))
}

#[tauri::command]
pub async fn remove_feed(state: State<'_, DbState>, feed_id: String) -> Result<(), String> {
    let conn = Arc::clone(&state.0);
    let db = conn.lock().map_err(|e| e.to_string())?;
    db_sub::remove_subscription_by_feed_id(&db, &feed_id).map_err(|e| e.to_string())?;
    if !db_sub::is_feed_used_elsewhere(&db, &feed_id).map_err(|e| e.to_string())? {
        db_feed::remove_feed(&db, &feed_id).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn remove_multiple_feeds(state: State<'_, DbState>, feed_ids: Vec<String>) -> Result<(), String> {
    let conn = Arc::clone(&state.0);
    for feed_id in &feed_ids {
        let db = conn.lock().map_err(|e| e.to_string())?;
        db_sub::remove_subscription_by_feed_id(&db, feed_id).map_err(|e| e.to_string())?;
        if !db_sub::is_feed_used_elsewhere(&db, feed_id).map_err(|e| e.to_string())? {
            db_feed::remove_feed(&db, feed_id).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_feeds(state: State<'_, DbState>) -> Result<Vec<FeedWithSubscription>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let subs = db_sub::get_subscriptions(&db).map_err(|e| e.to_string())?;

    let feed_ids: Vec<String> = subs.iter().map(|s| s.feed_id.clone()).collect();
    if feed_ids.is_empty() {
        return Ok(Vec::new());
    }

    let placeholders: Vec<&str> = feed_ids.iter().map(|_| "?").collect();
    let query = format!(
        "SELECT id, url, title, description, site_url, image_url, last_fetched_at, fetch_error, fetch_interval FROM feeds WHERE id IN ({})",
        placeholders.join(",")
    );

    let mut stmt = db.prepare(&query).map_err(|e| e.to_string())?;
    let params: Vec<Box<dyn rusqlite::types::ToSql>> = feed_ids
        .iter()
        .map(|id| Box::new(id.clone()) as Box<dyn rusqlite::types::ToSql>)
        .collect();
    let params_ref: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let feeds: Vec<Feed> = stmt
        .query_map(params_ref.as_slice(), |row| {
            Ok(Feed {
                id: row.get(0)?,
                url: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                site_url: row.get(4)?,
                image_url: row.get(5)?,
                last_fetched_at: row.get(6)?,
                fetch_error: row.get(7)?,
                fetch_interval: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let result: Vec<FeedWithSubscription> = feeds
        .into_iter()
        .map(|f| {
            let sub = subs.iter().find(|s| s.feed_id == f.id);
            FeedWithSubscription {
                category_id: sub.and_then(|s| s.category_id.clone()),
                subscription_id: sub.map(|s| s.subscription_id.clone()),
                custom_title: sub.and_then(|s| s.custom_title.clone()),
                feed: f,
            }
        })
        .collect();

    Ok(result)
}

#[tauri::command]
pub fn update_feed_cmd(
    state: State<'_, DbState>,
    feed_id: String,
    title: Option<String>,
    description: Option<String>,
    site_url: Option<String>,
    image_url: Option<String>,
    fetch_interval: Option<i32>,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_feed::update_feed(
        &db,
        &feed_id,
        title.as_deref(),
        description.as_deref(),
        site_url.as_deref(),
        image_url.as_deref(),
        fetch_interval,
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn refresh_all_feeds(state: State<'_, DbState>) -> Result<(), String> {
    let conn = Arc::clone(&state.0);
    let service = FeedService::new();
    service.refresh_all(&conn).await
}

#[tauri::command]
pub async fn refresh_feed(state: State<'_, DbState>, feed_id: String) -> Result<usize, String> {
    let conn = Arc::clone(&state.0);
    let service = FeedService::new();
    service.refresh_feed(&conn, &feed_id).await
}

// --- Category commands ---

#[tauri::command]
pub fn list_categories(state: State<'_, DbState>) -> Result<Vec<Category>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_cat::get_categories(&db).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_category(state: State<'_, DbState>, name: String) -> Result<String, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_cat::create_category(&db, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_category(state: State<'_, DbState>, id: String, name: String) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_cat::rename_category(&db, &id, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_category(state: State<'_, DbState>, id: String) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_cat::delete_category(&db, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_category(state: State<'_, DbState>, id: String, sort_order: i32) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_cat::reorder_category(&db, &id, sort_order).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn bulk_reorder_categories(state: State<'_, DbState>, items: Vec<ReorderItem>) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let pairs: Vec<(String, i32)> = items.into_iter().map(|i| (i.id, i.sort_order)).collect();
    db_cat::bulk_reorder_categories(&db, &pairs).map_err(|e| e.to_string())
}

// --- Drag-and-drop commands ---

#[tauri::command]
pub fn move_feed_to_category(
    state: State<'_, DbState>,
    subscription_id: String,
    category_id: Option<String>,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_sub::move_feed_to_category(&db, &subscription_id, category_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_feed(state: State<'_, DbState>, subscription_id: String, sort_order: i32) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_sub::reorder_subscription(&db, &subscription_id, sort_order).map_err(|e| e.to_string())
}

// --- Entry commands ---

#[tauri::command]
pub fn list_entries(state: State<'_, DbState>, filter: EntryFilter) -> Result<Vec<EntryWithFeed>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_entry::get_entries(&db, &filter).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_entry(state: State<'_, DbState>, entry_id: String) -> Result<Option<EntryWithFeed>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_entry::get_entry(&db, &entry_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_read(state: State<'_, DbState>, entry_id: String) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_entry::mark_read(&db, &entry_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn mark_all_read(
    state: State<'_, DbState>,
    feed_id: Option<String>,
    category_id: Option<String>,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_entry::mark_all_read(&db, feed_id.as_deref(), category_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_star(state: State<'_, DbState>, entry_id: String) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_entry::toggle_star(&db, &entry_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_unread_counts(
    state: State<'_, DbState>,
) -> Result<std::collections::HashMap<String, i64>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_entry::get_unread_counts(&db).map_err(|e| e.to_string())
}

// --- Article content ---

#[tauri::command]
pub async fn fetch_article_content_cmd(url: String) -> Result<String, String> {
    fetch_article_content(&url).await
}

// --- OPML ---

#[tauri::command]
pub fn export_opml(state: State<'_, DbState>) -> Result<String, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let data = db_settings::export_opml_data(&db).map_err(|e| e.to_string())?;
    Ok(opml::build_opml(&data))
}

#[tauri::command]
pub async fn import_opml(
    state: State<'_, DbState>,
    content: String,
    app: AppHandle,
) -> Result<serde_json::Value, String> {
    let urls = opml::parse_opml_urls(&content);
    let total = urls.len();
    let mut imported = 0;
    let mut errors = Vec::new();

    for url in &urls {
        let conn = Arc::clone(&state.0);
        let service = FeedService::new();
        match service.add_and_subscribe(&conn, url, None).await {
            Ok(_) => {
                imported += 1;
            }
            Err(e) => {
                errors.push(format!("{}: {}", url, e));
            }
        }
        let _ = app.emit(
            "opml-import-progress",
            serde_json::json!({
                "total": total,
                "imported": imported,
                "errors": errors.len()
            }),
        );
    }

    Ok(serde_json::json!({
        "imported": imported,
        "errors": errors
    }))
}

// --- Settings ---

#[tauri::command]
pub fn get_setting(state: State<'_, DbState>, key: String) -> Result<Option<String>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_settings::get_setting(&db, &key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(state: State<'_, DbState>, key: String, value: String) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db_settings::set_setting(&db, &key, &value).map_err(|e| e.to_string())
}

// --- System ---

#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    tauri::async_runtime::block_on(async {
        open::that(&url).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
pub fn is_dev() -> bool {
    cfg!(debug_assertions)
}

// --- Storage ---

#[tauri::command]
pub fn get_current_db_path(_state: State<'_, DbState>) -> Result<String, String> {
    Ok(get_default_db_path())
}

#[tauri::command]
pub fn get_default_db_path() -> String {
    dirs::data_local_dir()
        .map(|p| p.join("lightfeed").join("lightfeed.db").to_string_lossy().to_string())
        .unwrap_or_else(|| "lightfeed.db".to_string())
}

#[tauri::command]
pub fn check_db_exists(dir: String) -> serde_json::Value {
    let path = std::path::Path::new(&dir).join("lightfeed.db");
    serde_json::json!({
        "exists": path.exists(),
        "path": path.to_string_lossy()
    })
}

#[tauri::command]
pub fn select_folder(_app: AppHandle) -> Result<Option<String>, String> {
    Ok(None)
}

// --- Cleanup ---

#[tauri::command]
pub fn run_cleanup_now(state: State<'_, DbState>) -> Result<usize, String> {
    Ok(cleanup::run_cleanup(&state.0))
}

// --- Version ---

#[tauri::command]
pub fn get_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}
