use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use log::{info, error};

use crate::db::entry;
use crate::db::settings;

pub fn start_cleanup_scheduler(conn: Arc<Mutex<Connection>>) {
    tauri::async_runtime::spawn(async move {
        // Initial cleanup after 60 seconds
        tokio::time::sleep(tokio::time::Duration::from_secs(60)).await;
        run_cleanup(&conn);

        // Then every 24 hours
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(24 * 60 * 60));
        loop {
            interval.tick().await;
            run_cleanup(&conn);
        }
    });
}

pub fn get_cleanup_days(conn: &Connection) -> Option<i64> {
    match settings::get_setting(conn, "cleanup_older_than_days") {
        Ok(Some(v)) => v.parse::<i64>().ok().filter(|&d| d > 0),
        _ => None,
    }
}

pub fn run_cleanup(conn: &Arc<Mutex<Connection>>) -> usize {
    let days = {
        let db = match conn.lock() {
            Ok(db) => db,
            Err(_) => return 0,
        };
        match get_cleanup_days(&db) {
            Some(d) => d,
            None => return 0,
        }
    };

    let db = match conn.lock() {
        Ok(db) => db,
        Err(_) => return 0,
    };

    match entry::delete_entries_older_than(&db, days) {
        Ok(count) => {
            if count > 0 {
                info!("[Cleanup] Deleted {} entries older than {} days", count, days);
            }
            count
        }
        Err(e) => {
            error!("[Cleanup] Error: {}", e);
            0
        }
    }
}
