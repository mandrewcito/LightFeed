import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Feeds
  addFeed: (url: string, categoryId?: string) =>
    ipcRenderer.invoke('feed:add', url, categoryId),
  removeFeed: (feedId: string) =>
    ipcRenderer.invoke('feed:remove', feedId),
  removeMultipleFeeds: (feedIds: string[]) =>
    ipcRenderer.invoke('feed:removeMultiple', feedIds),
  getFeeds: () =>
    ipcRenderer.invoke('feed:list'),
  updateFeed: (feedId: string, updates: Record<string, unknown>) =>
    ipcRenderer.invoke('feed:update', feedId, updates),

  // Categories
  getCategories: () =>
    ipcRenderer.invoke('category:list'),
  createCategory: (name: string) =>
    ipcRenderer.invoke('category:create', name),
  renameCategory: (id: string, name: string) =>
    ipcRenderer.invoke('category:rename', id, name),
  deleteCategory: (id: string) =>
    ipcRenderer.invoke('category:delete', id),
  reorderCategory: (id: string, sortOrder: number) =>
    ipcRenderer.invoke('category:reorder', id, sortOrder),
  bulkReorderCategories: (items: Array<{ id: string; sort_order: number }>) =>
    ipcRenderer.invoke('category:bulkReorder', items),

  // Drag-and-drop
  moveFeedToCategory: (subscriptionId: string, categoryId: string | null) =>
    ipcRenderer.invoke('feed:moveToCategory', subscriptionId, categoryId),
  reorderFeed: (subscriptionId: string, sortOrder: number) =>
    ipcRenderer.invoke('feed:reorder', subscriptionId, sortOrder),

  // Entries
  getEntries: (filter: unknown) =>
    ipcRenderer.invoke('entry:list', filter),
  getEntry: (entryId: string) =>
    ipcRenderer.invoke('entry:get', entryId),
  markRead: (entryId: string) =>
    ipcRenderer.invoke('entry:markRead', entryId),
  markAllRead: (feedId?: string, categoryId?: string) =>
    ipcRenderer.invoke('entry:markAllRead', feedId, categoryId),
  toggleStar: (entryId: string) =>
    ipcRenderer.invoke('entry:toggleStar', entryId),
  getUnreadCounts: () =>
    ipcRenderer.invoke('entry:unreadCounts'),

  // Article content
  fetchArticleContent: (url: string) =>
    ipcRenderer.invoke('article:fetchContent', url),

  // OPML
  exportOPML: () =>
    ipcRenderer.invoke('opml:export'),
  importOPML: (content: string) =>
    ipcRenderer.invoke('opml:import', content),

  // Settings
  getSetting: (key: string) =>
    ipcRenderer.invoke('setting:get', key),
  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke('setting:set', key, value),

  // Feed management
  refreshAll: () =>
    ipcRenderer.invoke('feed:refreshAll'),
  refreshFeed: (feedId: string) =>
    ipcRenderer.invoke('feed:refresh', feedId),

  // System
  openExternal: (url: string) =>
    ipcRenderer.invoke('system:openExternal', url),
  getPlatform: () =>
    ipcRenderer.invoke('system:platform'),
  isDev: () =>
    ipcRenderer.invoke('system:isDev'),

  // Storage location
  getCurrentDbPath: () =>
    ipcRenderer.invoke('db:getCurrentPath'),
  getDefaultDbPath: () =>
    ipcRenderer.invoke('db:getDefaultPath'),
  checkDbExists: (dir: string) =>
    ipcRenderer.invoke('db:checkExists', dir),
  moveDb: (newDir: string, mode: 'replace' | 'use-existing') =>
    ipcRenderer.invoke('db:move', newDir, mode),
  selectFolder: () =>
    ipcRenderer.invoke('dialog:selectFolder'),

  // Import progress
  onImportProgress: (callback: (data: { total: number; imported: number; errors: number }) => void) =>
    ipcRenderer.on('opml:importProgress', (_event, data) => callback(data)),

  // Cleanup
  runCleanupNow: () =>
    ipcRenderer.invoke('cleanup:runNow'),

  // Updates
  getVersion: () =>
    ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () =>
    ipcRenderer.invoke('update:check'),
  downloadUpdate: () =>
    ipcRenderer.invoke('update:download'),
  installUpdate: () =>
    ipcRenderer.invoke('update:install'),

  // Update event listeners
  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes: string }) => void) =>
    ipcRenderer.on('update:available', (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback: () => void) =>
    ipcRenderer.on('update:notAvailable', () => callback()),
  onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) =>
    ipcRenderer.on('update:downloadProgress', (_event, progress) => callback(progress)),
  onUpdateDownloaded: (callback: () => void) =>
    ipcRenderer.on('update:downloaded', () => callback()),
  onUpdateError: (callback: (error: string) => void) =>
    ipcRenderer.on('update:error', (_event, error) => callback())
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
