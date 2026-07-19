use rusqlite::{params, Connection, Result};
use uuid::Uuid;

use super::models::Subscription;

pub fn add_subscription(conn: &Connection, feed_id: &str, category_id: Option<&str>) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn
        .prepare("SELECT COALESCE(MAX(sort_order), 0) FROM subscriptions WHERE category_id IS ?1")?
        .query_row(params![category_id], |row| row.get(0))?;
    conn.execute(
        "INSERT INTO subscriptions (id, feed_id, category_id, sort_order) VALUES (?1, ?2, ?3, ?4)",
        params![id, feed_id, category_id, max_order + 1],
    )?;
    Ok(id)
}

pub fn get_subscriptions(conn: &Connection) -> Result<Vec<Subscription>> {
    let mut stmt = conn.prepare(
        "SELECT id as subscription_id, feed_id, category_id, custom_title, sort_order, created_at
         FROM subscriptions ORDER BY category_id NULLS LAST, sort_order",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Subscription {
            subscription_id: row.get(0)?,
            feed_id: row.get(1)?,
            category_id: row.get(2)?,
            custom_title: row.get(3)?,
            sort_order: row.get(4)?,
            created_at: row.get(5)?,
        })
    })?;
    rows.collect::<Result<Vec<_>>>()
}

pub fn remove_subscription_by_feed_id(conn: &Connection, feed_id: &str) -> Result<usize> {
    conn.execute("DELETE FROM subscriptions WHERE feed_id = ?1", params![feed_id])
}

pub fn move_feed_to_category(conn: &Connection, subscription_id: &str, category_id: Option<&str>) -> Result<()> {
    let max_order: i32 = conn
        .prepare("SELECT COALESCE(MAX(sort_order), 0) FROM subscriptions WHERE category_id IS ?1")?
        .query_row(params![category_id], |row| row.get(0))?;
    conn.execute(
        "UPDATE subscriptions SET category_id = ?1, sort_order = ?2 WHERE id = ?3",
        params![category_id, max_order + 1, subscription_id],
    )?;
    Ok(())
}

pub fn reorder_subscription(conn: &Connection, subscription_id: &str, sort_order: i32) -> Result<()> {
    conn.execute("UPDATE subscriptions SET sort_order = ?1 WHERE id = ?2", params![sort_order, subscription_id])?;
    Ok(())
}

pub fn bulk_reorder_subscriptions(conn: &Connection, items: &[(String, i32)]) -> Result<()> {
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare("UPDATE subscriptions SET sort_order = ?1 WHERE id = ?2")?;
        for (id, order) in items {
            stmt.execute(params![order, id])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn is_feed_used_elsewhere(conn: &Connection, feed_id: &str) -> Result<bool> {
    let count: i32 = conn
        .prepare("SELECT COUNT(*) FROM subscriptions WHERE feed_id = ?1")?
        .query_row(params![feed_id], |row| row.get(0))?;
    Ok(count > 0)
}
