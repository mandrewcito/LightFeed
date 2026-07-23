use rusqlite::{params, Connection, Result, OptionalExtension};
use uuid::Uuid;

use super::models::Feed;

pub fn upsert_feed(
    conn: &Connection,
    url: &str,
    title: Option<&str>,
    description: Option<&str>,
    site_url: Option<&str>,
    image_url: Option<&str>,
) -> Result<(String, bool)> {
    let existing: Option<String> = conn
        .prepare("SELECT id FROM feeds WHERE url = ?1")?
        .query_row(params![url], |row| row.get(0))
        .ok();

    if let Some(id) = existing {
        conn.execute(
            "UPDATE feeds SET title = ?1, description = ?2, site_url = ?3, image_url = ?4 WHERE id = ?5",
            params![title, description, site_url, image_url, id],
        )?;
        return Ok((id, false));
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO feeds (id, url, title, description, site_url, image_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, url, title, description, site_url, image_url],
    )?;
    Ok((id, true))
}

pub fn update_feed_last_fetched(conn: &Connection, feed_id: &str, has_error: bool, error_msg: Option<&str>) -> Result<()> {
    if has_error {
        conn.execute(
            "UPDATE feeds SET last_fetched_at = unixepoch(), fetch_error = ?1 WHERE id = ?2",
            params![error_msg.unwrap_or("Unknown error"), feed_id],
        )?;
    } else {
        conn.execute(
            "UPDATE feeds SET last_fetched_at = unixepoch(), fetch_error = NULL WHERE id = ?1",
            params![feed_id],
        )?;
    }
    Ok(())
}

pub fn get_feed_by_id(conn: &Connection, feed_id: &str) -> Result<Option<Feed>> {
    conn.prepare(
        "SELECT id, url, title, description, site_url, image_url, last_fetched_at, fetch_error, fetch_interval FROM feeds WHERE id = ?1",
    )?
    .query_row(params![feed_id], |row| {
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
    .optional()
}

pub fn remove_feed(conn: &Connection, feed_id: &str) -> Result<usize> {
    conn.execute("DELETE FROM feeds WHERE id = ?1", params![feed_id])
}

pub fn update_feed(
    conn: &Connection,
    feed_id: &str,
    title: Option<&str>,
    description: Option<&str>,
    site_url: Option<&str>,
    image_url: Option<&str>,
    fetch_interval: Option<i32>,
) -> Result<()> {
    conn.execute(
        "UPDATE feeds SET title = COALESCE(?1, title), description = COALESCE(?2, description), site_url = COALESCE(?3, site_url), image_url = COALESCE(?4, image_url), fetch_interval = COALESCE(?5, fetch_interval) WHERE id = ?6",
        params![title, description, site_url, image_url, fetch_interval, feed_id],
    )?;
    Ok(())
}

pub fn get_feed_id_by_url(conn: &Connection, url: &str) -> Result<Option<String>> {
    conn.prepare("SELECT id FROM feeds WHERE url = ?1")?
        .query_row(params![url], |row| row.get(0))
        .optional()
}
