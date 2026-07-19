use rusqlite::{params, Connection, Result, OptionalExtension};

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    conn.prepare("SELECT value FROM settings WHERE key = ?1")?
        .query_row(params![key], |row| row.get(0))
        .optional()
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}

pub fn export_opml_data(conn: &Connection) -> Result<Vec<(String, Option<String>, Option<String>)>> {
    let mut stmt = conn.prepare(
        "SELECT f.url, f.title, c.name
         FROM subscriptions s
         JOIN feeds f ON s.feed_id = f.id
         LEFT JOIN categories c ON s.category_id = c.id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })?;
    rows.collect::<Result<Vec<_>>>()
}
