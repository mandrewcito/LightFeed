pub mod models;
pub mod feed;
pub mod category;
pub mod subscription;
pub mod entry;
pub mod settings;

use rusqlite::{Connection, Result};
use std::path::Path;

pub fn init_database(path: &Path) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(conn)
}

fn run_migrations(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS feeds (
            id TEXT PRIMARY KEY,
            url TEXT UNIQUE NOT NULL,
            title TEXT,
            description TEXT,
            site_url TEXT,
            image_url TEXT,
            last_fetched_at INTEGER,
            fetch_error TEXT,
            fetch_interval INTEGER DEFAULT 30
        );

        CREATE TABLE IF NOT EXISTS categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT PRIMARY KEY,
            feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
            category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
            custom_title TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY,
            feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
            title TEXT,
            url TEXT,
            content TEXT,
            readable_content TEXT,
            author TEXT,
            published_at INTEGER,
            fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
            has_read INTEGER DEFAULT 0,
            starred INTEGER DEFAULT 0,
            thumbnail TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_entries_feed ON entries(feed_id);
        CREATE INDEX IF NOT EXISTS idx_entries_published ON entries(published_at DESC);
        CREATE INDEX IF NOT EXISTS idx_entries_read ON entries(has_read);
        CREATE INDEX IF NOT EXISTS idx_entries_starred ON entries(starred);
        CREATE INDEX IF NOT EXISTS idx_entries_published_at ON entries(published_at);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );",
    )?;

    // Migration: add sort_order to subscriptions if missing
    let has_sort_order: bool = conn
        .prepare("PRAGMA table_info(subscriptions)")?
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .any(|name| name == "sort_order");

    if !has_sort_order {
        conn.execute_batch("ALTER TABLE subscriptions ADD COLUMN sort_order INTEGER DEFAULT 0")?;
    }

    Ok(())
}

pub fn entry_id(feed_id: &str, url: Option<&str>, title: Option<&str>, published_at: Option<i64>) -> String {
    use sha1::{Digest, Sha1};
    let key = format!(
        "{}:{}",
        feed_id,
        url.or(title).unwrap_or(&published_at.map_or(uuid::Uuid::new_v4().to_string(), |v| v.to_string()))
    );
    let mut hasher = Sha1::new();
    hasher.update(key.as_bytes());
    format!("{:x}", hasher.finalize())
}
