import { ipcMain, shell, app, dialog } from 'electron'
import { is } from '@electron-toolkit/utils'
import { FeedService, fetchArticleContent } from './feed-service'
import { downloadUpdate, quitAndInstall } from './auto-updater'
import {
  getDatabase,
  removeFeed,
  updateFeed,
  getSubscriptions,
  addSubscription,
  removeSubscriptionByFeedId,
  getFeedIdByUrl,
  getCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  reorderCategory,
  moveFeedToCategory,
  reorderSubscription,
  bulkReorderSubscriptions,
  bulkReorderCategories,
  getEntries,
  getEntry,
  markRead,
  markAllRead,
  toggleStar,
  getUnreadCounts,
  getSetting,
  setSetting,
  exportOPMLData,
  getDefaultDbPath,
  getCurrentDbPath,
  moveDatabase,
  checkDbExists
} from './database'
import { runCleanup } from './cleanup-service'
import { getFaviconUrl } from './utils'

const feedService = new FeedService()

function buildOPML(subs: Array<{ feed_url: string; title: string | null; category: string | null }>): string {
  const byCategory: Record<string, typeof subs> = {}
  const uncategorized: typeof subs = []

  for (const sub of subs) {
    if (sub.category) {
      if (!byCategory[sub.category]) byCategory[sub.category] = []
      byCategory[sub.category].push(sub)
    } else {
      uncategorized.push(sub)
    }
  }

  let opml = `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n  <title>LightFeed Subscriptions</title>\n</head>\n<body>\n`

  for (const [cat, feeds] of Object.entries(byCategory)) {
    opml += `  <outline text="${escapeXml(cat)}">\n`
    for (const f of feeds) {
      opml += `    <outline type="rss" text="${escapeXml(f.title || f.feed_url)}" xmlUrl="${escapeXml(f.feed_url)}" />\n`
    }
    opml += `  </outline>\n`
  }

  for (const f of uncategorized) {
    opml += `  <outline type="rss" text="${escapeXml(f.title || f.feed_url)}" xmlUrl="${escapeXml(f.feed_url)}" />\n`
  }

  opml += `</body>\n</opml>`
  return opml
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function registerIpcHandlers(): void {
  // Feeds
  ipcMain.handle('feed:add', async (_event, url: string, categoryId?: string) => {
    // Check if already subscribed
    const existingId = getFeedIdByUrl(url)
    if (existingId) {
      addSubscription(existingId, categoryId)
      return { id: existingId, isNew: false }
    }
    const feedId = await feedService.addAndSubscribe(url, categoryId)
    return { id: feedId, isNew: true }
  })

  ipcMain.handle('feed:remove', (_event, feedId: string) => {
    removeSubscriptionByFeedId(feedId)
    const subs = getSubscriptions()
    const stillUsed = subs.some((s) => s.feed_id === feedId)
    if (!stillUsed) {
      removeFeed(feedId)
    }
  })

  ipcMain.handle('feed:removeMultiple', (_event, feedIds: string[]) => {
    for (const feedId of feedIds) {
      removeSubscriptionByFeedId(feedId)
      const subs = getSubscriptions()
      const stillUsed = subs.some((s) => s.feed_id === feedId)
      if (!stillUsed) {
        removeFeed(feedId)
      }
    }
  })

  ipcMain.handle('feed:list', () => {
    const subs = getSubscriptions()
    const feedIds = subs.map((s) => s.feed_id)
    if (feedIds.length === 0) return []

    const placeholders = feedIds.map(() => '?').join(',')
    const db = getDatabase()
    const feeds = db.prepare(`SELECT * FROM feeds WHERE id IN (${placeholders})`).all(...feedIds) as Array<Record<string, unknown>>

    return feeds.map((f) => {
      const sub = subs.find((s) => s.feed_id === f.id)
      return {
        ...f,
        category_id: sub?.category_id || null,
        subscription_id: sub?.subscription_id || null,
        custom_title: sub?.custom_title || null
      }
    })
  })

  ipcMain.handle('feed:update', (_event, feedId: string, updates: Record<string, unknown>) => {
    updateFeed(feedId, updates)
  })

  ipcMain.handle('feed:refreshAll', async () => {
    await feedService.refreshAll()
  })

  ipcMain.handle('feed:refresh', async (_event, feedId: string) => {
    await feedService.refreshFeed(feedId)
  })

  // Categories
  ipcMain.handle('category:list', () => getCategories())

  ipcMain.handle('category:create', (_event, name: string) => {
    return createCategory(name)
  })

  ipcMain.handle('category:rename', (_event, id: string, name: string) => {
    renameCategory(id, name)
  })

  ipcMain.handle('category:delete', (_event, id: string) => {
    deleteCategory(id)
  })

  ipcMain.handle('category:reorder', (_event, id: string, sortOrder: number) => {
    reorderCategory(id, sortOrder)
  })

  ipcMain.handle('category:bulkReorder', (_event, items: Array<{ id: string; sort_order: number }>) => {
    bulkReorderCategories(items)
  })

  // Drag-and-drop
  ipcMain.handle('feed:moveToCategory', (_event, subscriptionId: string, categoryId: string | null) => {
    moveFeedToCategory(subscriptionId, categoryId)
  })

  ipcMain.handle('feed:reorder', (_event, subscriptionId: string, sortOrder: number) => {
    reorderSubscription(subscriptionId, sortOrder)
  })

  // Entries
  ipcMain.handle('entry:list', (_event, filter) => {
    return getEntries(filter)
  })

  ipcMain.handle('entry:get', (_event, entryId: string) => {
    return getEntry(entryId)
  })

  ipcMain.handle('entry:markRead', (_event, entryId: string) => {
    markRead(entryId)
  })

  ipcMain.handle('entry:markAllRead', (_event, feedId?: string, categoryId?: string) => {
    markAllRead(feedId, categoryId)
  })

  ipcMain.handle('entry:toggleStar', (_event, entryId: string) => {
    toggleStar(entryId)
  })

  ipcMain.handle('entry:unreadCounts', () => {
    return getUnreadCounts()
  })

  // Article content
  ipcMain.handle('article:fetchContent', async (_event, url: string) => {
    return fetchArticleContent(url)
  })

  // OPML
  ipcMain.handle('opml:export', () => {
    const data = exportOPMLData()
    return buildOPML(data)
  })

  ipcMain.handle('opml:import', async (event, content: string) => {
    const regex = /xmlUrl="([^"]+)"/g
    const matches: string[] = []
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1])
    }

    const total = matches.length
    let imported = 0
    const errors: string[] = []

    for (const url of matches) {
      try {
        await feedService.addAndSubscribe(url)
        imported++
      } catch (err) {
        errors.push(`${url}: ${String(err)}`)
      }
      event.sender.send('opml:importProgress', { total, imported, errors: errors.length })
    }

    return { imported, errors }
  })

  // Settings
  ipcMain.handle('setting:get', (_event, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('setting:set', (_event, key: string, value: string) => {
    setSetting(key, value)
  })

  // System
  ipcMain.handle('system:openExternal', (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('system:platform', () => {
    return process.platform
  })

  ipcMain.handle('system:isDev', () => {
    return is.dev
  })

  // Storage location
  ipcMain.handle('db:getCurrentPath', () => {
    return getCurrentDbPath()
  })

  ipcMain.handle('db:getDefaultPath', () => {
    return getDefaultDbPath()
  })

  ipcMain.handle('db:checkExists', (_event, dir: string) => {
    return checkDbExists(dir)
  })

  ipcMain.handle('db:move', (_event, newDir: string, mode: 'replace' | 'use-existing') => {
    moveDatabase(newDir, mode)
    app.relaunch()
    app.exit()
  })

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Cleanup
  ipcMain.handle('cleanup:runNow', () => {
    return runCleanup()
  })

  // Updates
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('update:check', () => {
    const { autoUpdater } = require('electron-updater')
    autoUpdater.autoDownload = false
    autoUpdater.checkForUpdates()
  })

  ipcMain.handle('update:download', () => {
    downloadUpdate()
  })

  ipcMain.handle('update:install', () => {
    quitAndInstall()
  })
}
