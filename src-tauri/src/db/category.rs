use rusqlite::{params, Connection, Result};
use uuid::Uuid;

use super::models::Category;

pub fn get_categories(conn: &Connection) -> Result<Vec<Category>> {
    let mut stmt = conn.prepare("SELECT id, name, sort_order FROM categories ORDER BY sort_order")?;
    let rows = stmt.query_map([], |row| {
        Ok(Category {
            id: row.get(0)?,
            name: row.get(1)?,
            sort_order: row.get(2)?,
        })
    })?;
    rows.collect::<Result<Vec<_>>>()
}

pub fn create_category(conn: &Connection, name: &str) -> Result<String> {
    let id = Uuid::new_v4().to_string();
    let max_order: i32 = conn
        .prepare("SELECT COALESCE(MAX(sort_order), 0) FROM categories")?
        .query_row([], |row| row.get(0))?;
    conn.execute(
        "INSERT INTO categories (id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![id, name, max_order + 1],
    )?;
    Ok(id)
}

pub fn rename_category(conn: &Connection, id: &str, name: &str) -> Result<()> {
    conn.execute("UPDATE categories SET name = ?1 WHERE id = ?2", params![name, id])?;
    Ok(())
}

pub fn delete_category(conn: &Connection, id: &str) -> Result<()> {
    conn.execute("UPDATE subscriptions SET category_id = NULL WHERE category_id = ?1", params![id])?;
    conn.execute("DELETE FROM categories WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn reorder_category(conn: &Connection, id: &str, sort_order: i32) -> Result<()> {
    conn.execute("UPDATE categories SET sort_order = ?1 WHERE id = ?2", params![sort_order, id])?;
    Ok(())
}

pub fn bulk_reorder_categories(conn: &Connection, items: &[(String, i32)]) -> Result<()> {
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare("UPDATE categories SET sort_order = ?1 WHERE id = ?2")?;
        for (id, order) in items {
            stmt.execute(params![order, id])?;
        }
    }
    tx.commit()?;
    Ok(())
}
