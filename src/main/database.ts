import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { createHash } from 'crypto'
import { app } from 'electron'
import { v4 as uuid } from 'uuid'
import { existsSync, copyFileSync, unlinkSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

function entryId(feedId: string, url: string | null, title: string | null, publishedAt: number | null): string {
  const key = `${feedId}:${url || title || publishedAt || uuid()}`
  return createHash('sha1').update(key).digest('hex')
}

let db: Database.Database
let currentDbPath: string

export function getDefaultDbPath(): string {
  return join(app.getPath('userData'), 'lightfeed.db')
}

function getStorageConfigPath(): string {
  return join(app.getPath('userData'), 'storage-location.json')
}

function readStorageConfig(): string | null {
  const configPath = getStorageConfigPath()
  if (!existsSync(configPath)) return null
  try {
    const data = JSON.parse(readFileSync(configPath, 'utf-8'))
    return data.path || null
  } catch {
    return null
  }
}

function writeStorageConfig(dbPath: string): void {
  writeFileSync(getStorageConfigPath(), JSON.stringify({ path: dbPath }, null, 2))
}

export function getCurrentDbPath(): string {
  return currentDbPath
}

function initDatabaseWithPath(dbPath: string): void {
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  currentDbPath = dbPath
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
}

export function initDatabase(): void {
  const configuredPath = readStorageConfig()
  const dbPath = configuredPath || getDefaultDbPath()
  initDatabaseWithPath(dbPath)
}

export function checkDbExists(dir: string): { exists: boolean; path: string } {
  const dbPath = join(dir, 'lightfeed.db')
  return { exists: existsSync(dbPath), path: dbPath }
}

export function moveDatabase(newDir: string, mode: 'replace' | 'use-existing'): void {
  if (!db) return

  const oldPath = currentDbPath
  const newPath = join(newDir, 'lightfeed.db')

  if (oldPath === newPath) return

  if (!existsSync(newDir)) {
    mkdirSync(newDir, { recursive: true })
  }

  db.close()

  if (mode === 'replace') {
    if (existsSync(newPath)) {
      unlinkSync(newPath)
    }
    copyFileSync(oldPath, newPath)
    if (existsSync(oldPath)) {
      unlinkSync(oldPath)
    }
  }

  writeStorageConfig(newPath)
  initDatabaseWithPath(newPath)
}

function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS feeds (
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
    );
  `)

  // Migration: add sort_order to subscriptions if missing
  const cols = db.prepare("PRAGMA table_info(subscriptions)").all() as Array<{ name: string }>
  if (!cols.some((c) => c.name === 'sort_order')) {
    db.exec('ALTER TABLE subscriptions ADD COLUMN sort_order INTEGER DEFAULT 0')
  }
}

// --- Feed operations ---

export function upsertFeed(
  url: string,
  title: string | null,
  description: string | null,
  siteUrl: string | null,
  imageUrl: string | null
): { id: string; isNew: boolean } {
  const existing = db.prepare('SELECT id FROM feeds WHERE url = ?').get(url) as { id: string } | undefined
  if (existing) {
    db.prepare(`
      UPDATE feeds SET title = ?, description = ?, site_url = ?, image_url = ? WHERE id = ?
    `).run(title, description, siteUrl, imageUrl, existing.id)
    return { id: existing.id, isNew: false }
  }
  const id = uuid()
  db.prepare(`
    INSERT INTO feeds (id, url, title, description, site_url, image_url) VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, url, title, description, siteUrl, imageUrl)
  return { id, isNew: true }
}

export function updateFeedLastFetched(feedId: string, hasError: boolean, errorMsg?: string): void {
  db.prepare(`
    UPDATE feeds SET last_fetched_at = unixepoch(), fetch_error = ? WHERE id = ?
  `).run(hasError ? (errorMsg || 'Unknown error') : null, feedId)
}

export function getFeedById(feedId: string) {
  return db.prepare('SELECT * FROM feeds WHERE id = ?').get(feedId)
}

export function getAllFeeds() {
  return db.prepare('SELECT * FROM feeds').all()
}

export function removeFeed(feedId: string): void {
  db.prepare('DELETE FROM feeds WHERE id = ?').run(feedId)
}

export function updateFeed(feedId: string, updates: Record<string, unknown>): void {
  const allowed = ['title', 'description', 'site_url', 'image_url', 'fetch_interval']
  const keys = Object.keys(updates).filter((k) => allowed.includes(k))
  if (keys.length === 0) return
  const sets = keys.map((k) => `${k} = ?`).join(', ')
  const values = keys.map((k) => (updates as Record<string, unknown>)[k])
  db.prepare(`UPDATE feeds SET ${sets} WHERE id = ?`).run(...values, feedId)
}

// --- Subscription operations ---

export function addSubscription(feedId: string, categoryId?: string): string {
  const id = uuid()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM subscriptions WHERE category_id IS ?').get(categoryId || null) as { m: number }).m || 0
  db.prepare(`
    INSERT INTO subscriptions (id, feed_id, category_id, sort_order) VALUES (?, ?, ?, ?)
  `).run(id, feedId, categoryId || null, maxOrder + 1)
  return id
}

export function getSubscriptions(): Array<{ subscription_id: string; feed_id: string; category_id: string | null; custom_title: string | null; sort_order: number; created_at: number }> {
  return db.prepare('SELECT id as subscription_id, feed_id, category_id, custom_title, sort_order, created_at FROM subscriptions ORDER BY category_id NULLS LAST, sort_order').all()
}

export function removeSubscriptionByFeedId(feedId: string): void {
  db.prepare('DELETE FROM subscriptions WHERE feed_id = ?').run(feedId)
}

export function getFeedIdByUrl(url: string): string | null {
  const row = db.prepare('SELECT id FROM feeds WHERE url = ?').get(url) as { id: string } | undefined
  return row?.id || null
}

// --- Drag-and-drop operations ---

export function moveFeedToCategory(subscriptionId: string, categoryId: string | null): void {
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM subscriptions WHERE category_id IS ?').get(categoryId) as { m: number }).m || 0
  db.prepare('UPDATE subscriptions SET category_id = ?, sort_order = ? WHERE id = ?').run(categoryId, maxOrder + 1, subscriptionId)
}

export function reorderSubscription(subscriptionId: string, sortOrder: number): void {
  db.prepare('UPDATE subscriptions SET sort_order = ? WHERE id = ?').run(sortOrder, subscriptionId)
}

export function bulkReorderSubscriptions(items: Array<{ id: string; sort_order: number }>): void {
  const stmt = db.prepare('UPDATE subscriptions SET sort_order = ? WHERE id = ?')
  const tx = db.transaction((items: Array<{ id: string; sort_order: number }>) => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id)
    }
  })
  tx(items)
}

export function bulkReorderCategories(items: Array<{ id: string; sort_order: number }>): void {
  const stmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?')
  const tx = db.transaction((items: Array<{ id: string; sort_order: number }>) => {
    for (const item of items) {
      stmt.run(item.sort_order, item.id)
    }
  })
  tx(items)
}

// --- Category operations ---

export function getCategories() {
  return db.prepare('SELECT * FROM categories ORDER BY sort_order').all()
}

export function createCategory(name: string): string {
  const id = uuid()
  const maxOrder = (db.prepare('SELECT MAX(sort_order) as m FROM categories').get() as { m: number }).m || 0
  db.prepare('INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)').run(id, name, maxOrder + 1)
  return id
}

export function renameCategory(id: string, name: string): void {
  db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id)
}

export function deleteCategory(id: string): void {
  db.prepare('UPDATE subscriptions SET category_id = NULL WHERE category_id = ?').run(id)
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
}

export function reorderCategory(id: string, sortOrder: number): void {
  db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?').run(sortOrder, id)
}

// --- Entry operations ---

export function upsertEntries(feedId: string, items: Array<{
  title: string | null
  url: string | null
  content: string | null
  author: string | null
  published_at: number | null
  thumbnail: string | null
}>): number {
  const insert = db.prepare(`
    INSERT INTO entries (id, feed_id, title, url, content, author, published_at, thumbnail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      url = excluded.url,
      content = excluded.content,
      author = excluded.author,
      published_at = excluded.published_at,
      thumbnail = excluded.thumbnail
  `)
  const insertMany = db.transaction((items: typeof items) => {
    let count = 0
    for (const item of items) {
      const id = entryId(feedId, item.url, item.title, item.published_at)
      const result = insert.run(id, feedId, item.title, item.url, item.content, item.author, item.published_at, item.thumbnail)
      if (result.changes > 0) count++
    }
    return count
  })
  return insertMany(items)
}

export function getEntries(filter: {
  feed_id?: string
  category_id?: string
  starred?: boolean
  unread_only?: boolean
  search?: string
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const params: unknown[] = []

  if (filter.feed_id) {
    conditions.push('e.feed_id = ?')
    params.push(filter.feed_id)
  }
  if (filter.category_id) {
    conditions.push('s.category_id = ?')
    params.push(filter.category_id)
  }
  if (filter.starred) {
    conditions.push('e.starred = 1')
  }
  if (filter.unread_only) {
    conditions.push('e.has_read = 0')
  }
  if (filter.search) {
    conditions.push('(e.title LIKE ? OR e.content LIKE ?)')
    params.push(`%${filter.search}%`, `%${filter.search}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const needsJoin = filter.category_id

  const query = `
    SELECT e.*, f.title as feed_title, f.image_url as feed_image_url
    FROM entries e
    JOIN feeds f ON e.feed_id = f.id
    ${needsJoin ? 'JOIN subscriptions s ON e.feed_id = s.feed_id' : ''}
    ${where}
    ORDER BY e.published_at DESC NULLS LAST, e.fetched_at DESC
    LIMIT ? OFFSET ?
  `

  params.push(filter.limit || 50, filter.offset || 0)
  return db.prepare(query).all(...params)
}

export function getEntry(entryId: string) {
  return db.prepare(`
    SELECT e.*, f.title as feed_title, f.image_url as feed_image_url
    FROM entries e
    JOIN feeds f ON e.feed_id = f.id
    WHERE e.id = ?
  `).get(entryId)
}

export function markRead(entryId: string): void {
  db.prepare('UPDATE entries SET has_read = 1 WHERE id = ?').run(entryId)
}

export function markAllRead(feedId?: string, categoryId?: string): void {
  if (feedId) {
    db.prepare('UPDATE entries SET has_read = 1 WHERE feed_id = ? AND has_read = 0').run(feedId)
  } else if (categoryId) {
    db.prepare(`
      UPDATE entries SET has_read = 1
      WHERE feed_id IN (SELECT feed_id FROM subscriptions WHERE category_id = ?)
      AND has_read = 0
    `).run(categoryId)
  } else {
    db.prepare('UPDATE entries SET has_read = 1 WHERE has_read = 0').run()
  }
}

export function toggleStar(entryId: string): void {
  db.prepare('UPDATE entries SET starred = CASE WHEN starred = 1 THEN 0 ELSE 1 END WHERE id = ?').run(entryId)
}

export function getUnreadCounts(): Record<string, number> {
  const rows = db.prepare(`
    SELECT feed_id, COUNT(*) as count
    FROM entries
    WHERE has_read = 0
    GROUP BY feed_id
  `).all() as Array<{ feed_id: string; count: number }>
  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.feed_id] = row.count
  }
  return counts
}

// --- Settings ---

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined
  return row?.value || null
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

// --- OPML ---

export function exportOPMLData(): Array<{ feed_url: string; title: string | null; category: string | null }> {
  return db.prepare(`
    SELECT f.url as feed_url, f.title, c.name as category
    FROM subscriptions s
    JOIN feeds f ON s.feed_id = f.id
    LEFT JOIN categories c ON s.category_id = c.id
  `).all()
}

// --- Cleanup ---

export function deleteEntriesOlderThan(days: number): number {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400
  const result = db.prepare('DELETE FROM entries WHERE published_at IS NOT NULL AND published_at < ? AND starred = 0').run(cutoff)
  return result.changes
}

export function getDatabase(): Database.Database {
  return db
}
