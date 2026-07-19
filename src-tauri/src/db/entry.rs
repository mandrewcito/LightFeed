use rusqlite::{params, Connection, Result, OptionalExtension};

use super::models::{Entry, EntryFilter, EntryWithFeed};
use super::entry_id;

pub fn upsert_entries(conn: &Connection, feed_id: &str, items: &[super::models::ParsedItem]) -> Result<usize> {
    let tx = conn.unchecked_transaction()?;
    let mut count = 0;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO entries (id, feed_id, title, url, content, author, published_at, thumbnail)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
               title = excluded.title,
               url = excluded.url,
               content = excluded.content,
               author = excluded.author,
               published_at = excluded.published_at,
               thumbnail = excluded.thumbnail",
        )?;
        for item in items {
            let id = entry_id(feed_id, item.url.as_deref(), item.title.as_deref(), item.published_at);
            let changes = stmt.execute(params![
                id,
                feed_id,
                item.title,
                item.url,
                item.content,
                item.author,
                item.published_at,
                item.thumbnail,
            ])?;
            if changes > 0 {
                count += 1;
            }
        }
    }
    tx.commit()?;
    Ok(count)
}

pub fn get_entries(conn: &Connection, filter: &EntryFilter) -> Result<Vec<EntryWithFeed>> {
    let mut conditions = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref feed_id) = filter.feed_id {
        conditions.push("e.feed_id = ?".to_string());
        param_values.push(Box::new(feed_id.clone()));
    }
    if let Some(ref category_id) = filter.category_id {
        conditions.push("s.category_id = ?".to_string());
        param_values.push(Box::new(category_id.clone()));
    }
    if filter.starred == Some(true) {
        conditions.push("e.starred = 1".to_string());
    }
    if filter.unread_only == Some(true) {
        conditions.push("e.has_read = 0".to_string());
    }
    if let Some(ref search) = filter.search {
        let pattern = format!("%{}%", search);
        conditions.push("(e.title LIKE ? OR e.content LIKE ?)".to_string());
        param_values.push(Box::new(pattern.clone()));
        param_values.push(Box::new(pattern));
    }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let needs_join = filter.category_id.is_some();
    let join_clause = if needs_join {
        "JOIN subscriptions s ON e.feed_id = s.feed_id"
    } else {
        ""
    };

    let limit = filter.limit.unwrap_or(50);
    let offset = filter.offset.unwrap_or(0);

    let query = format!(
        "SELECT e.id, e.feed_id, e.title, e.url, e.content, e.readable_content, e.author,
                e.published_at, e.fetched_at, e.has_read, e.starred, e.thumbnail,
                f.title as feed_title, f.image_url as feed_image_url
         FROM entries e
         JOIN feeds f ON e.feed_id = f.id
         {join_clause}
         {where_clause}
         ORDER BY e.published_at DESC NULLS LAST, e.fetched_at DESC
         LIMIT ? OFFSET ?"
    );

    param_values.push(Box::new(limit));
    param_values.push(Box::new(offset));

    let params_ref: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&query)?;
    let rows = stmt.query_map(params_ref.as_slice(), |row| {
        Ok(EntryWithFeed {
            entry: Entry {
                id: row.get(0)?,
                feed_id: row.get(1)?,
                title: row.get(2)?,
                url: row.get(3)?,
                content: row.get(4)?,
                readable_content: row.get(5)?,
                author: row.get(6)?,
                published_at: row.get(7)?,
                fetched_at: row.get(8)?,
                has_read: row.get::<_, i32>(9)? != 0,
                starred: row.get::<_, i32>(10)? != 0,
                thumbnail: row.get(11)?,
            },
            feed_title: row.get(12)?,
            feed_image_url: row.get(13)?,
        })
    })?;
    rows.collect::<Result<Vec<_>>>()
}

pub fn get_entry(conn: &Connection, entry_id_val: &str) -> Result<Option<EntryWithFeed>> {
    conn.prepare(
        "SELECT e.id, e.feed_id, e.title, e.url, e.content, e.readable_content, e.author,
                e.published_at, e.fetched_at, e.has_read, e.starred, e.thumbnail,
                f.title as feed_title, f.image_url as feed_image_url
         FROM entries e
         JOIN feeds f ON e.feed_id = f.id
         WHERE e.id = ?1",
    )?
    .query_row(params![entry_id_val], |row| {
        Ok(EntryWithFeed {
            entry: Entry {
                id: row.get(0)?,
                feed_id: row.get(1)?,
                title: row.get(2)?,
                url: row.get(3)?,
                content: row.get(4)?,
                readable_content: row.get(5)?,
                author: row.get(6)?,
                published_at: row.get(7)?,
                fetched_at: row.get(8)?,
                has_read: row.get::<_, i32>(9)? != 0,
                starred: row.get::<_, i32>(10)? != 0,
                thumbnail: row.get(11)?,
            },
            feed_title: row.get(12)?,
            feed_image_url: row.get(13)?,
        })
    })
    .optional()
}

pub fn mark_read(conn: &Connection, entry_id_val: &str) -> Result<()> {
    conn.execute("UPDATE entries SET has_read = 1 WHERE id = ?1", params![entry_id_val])?;
    Ok(())
}

pub fn mark_all_read(conn: &Connection, feed_id: Option<&str>, category_id: Option<&str>) -> Result<()> {
    if let Some(fid) = feed_id {
        conn.execute("UPDATE entries SET has_read = 1 WHERE feed_id = ?1 AND has_read = 0", params![fid])?;
    } else if let Some(cid) = category_id {
        conn.execute(
            "UPDATE entries SET has_read = 1
             WHERE feed_id IN (SELECT feed_id FROM subscriptions WHERE category_id = ?1)
             AND has_read = 0",
            params![cid],
        )?;
    } else {
        conn.execute("UPDATE entries SET has_read = 1 WHERE has_read = 0", [])?;
    }
    Ok(())
}

pub fn toggle_star(conn: &Connection, entry_id_val: &str) -> Result<()> {
    conn.execute(
        "UPDATE entries SET starred = CASE WHEN starred = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        params![entry_id_val],
    )?;
    Ok(())
}

pub fn get_unread_counts(conn: &Connection) -> Result<std::collections::HashMap<String, i64>> {
    let mut stmt = conn.prepare(
        "SELECT feed_id, COUNT(*) as count FROM entries WHERE has_read = 0 GROUP BY feed_id",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    })?;
    let mut counts = std::collections::HashMap::new();
    for row in rows {
        let (feed_id, count) = row?;
        counts.insert(feed_id, count);
    }
    Ok(counts)
}

pub fn set_readable_content(conn: &Connection, entry_id_val: &str, content: &str) -> Result<()> {
    conn.execute(
        "UPDATE entries SET readable_content = ?1 WHERE id = ?2",
        params![content, entry_id_val],
    )?;
    Ok(())
}

pub fn delete_entries_older_than(conn: &Connection, days: i64) -> Result<usize> {
    let now = chrono::Utc::now().timestamp();
    let cutoff = now - (days * 86400);
    let rows = conn.execute(
        "DELETE FROM entries WHERE published_at IS NOT NULL AND published_at < ?1 AND starred = 0",
        params![cutoff],
    )?;
    Ok(rows)
}
