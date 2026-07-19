import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-shell'

// --- Feed operations ---

export const api = {
  addFeed: (url: string, categoryId?: string) =>
    invoke<{ id: string; isNew: boolean }>('add_feed', { url, categoryId }),

  removeFeed: (feedId: string) =>
    invoke('remove_feed', { feedId }),

  removeMultipleFeeds: (feedIds: string[]) =>
    invoke('remove_multiple_feeds', { feedIds }),

  getFeeds: () =>
    invoke<any[]>('list_feeds'),

  updateFeed: (feedId: string, updates: Record<string, unknown>) =>
    invoke('update_feed', {
      feedId,
      title: updates.title,
      description: updates.description,
      siteUrl: updates.site_url,
      imageUrl: updates.image_url,
      fetchInterval: updates.fetch_interval,
    }),

  renameFeed: (subscriptionId: string, customTitle: string | null) =>
    invoke('rename_feed', { subscriptionId, customTitle }),

  // Categories

  getCategories: () =>
    invoke<any[]>('list_categories'),

  createCategory: (name: string) =>
    invoke<string>('create_category', { name }),

  renameCategory: (id: string, name: string) =>
    invoke('rename_category', { id, name }),

  deleteCategory: (id: string) =>
    invoke('delete_category', { id }),

  reorderCategory: (id: string, sortOrder: number) =>
    invoke('reorder_category', { id, sortOrder }),

  bulkReorderCategories: (items: Array<{ id: string; sort_order: number }>) =>
    invoke('bulk_reorder_categories', { items }),

  // Drag-and-drop

  moveFeedToCategory: (subscriptionId: string, categoryId: string | null) =>
    invoke('move_feed_to_category', { subscriptionId, categoryId }),

  reorderFeed: (subscriptionId: string, sortOrder: number) =>
    invoke('reorder_feed', { subscriptionId, sortOrder }),

  // Entries

  getEntries: (filter: any) =>
    invoke<any[]>('list_entries', { filter }),

  getEntry: (entryId: string) =>
    invoke<any>('get_entry', { entryId }),

  markRead: (entryId: string) =>
    invoke('mark_read', { entryId }),

  markAllRead: (feedId?: string, categoryId?: string) =>
    invoke('mark_all_read', { feedId, categoryId }),

  toggleStar: (entryId: string) =>
    invoke('toggle_star', { entryId }),

  getUnreadCounts: () =>
    invoke<Record<string, number>>('get_unread_counts'),

  // Article content

  fetchArticleContent: (url: string) =>
    invoke<string>('fetch_article_content_cmd', { url }),

  saveEntryContent: (entryId: string, content: string) =>
    invoke<void>('save_entry_content', { entryId, content }),

  getEntryContent: (entryId: string) =>
    invoke<string | null>('get_entry_content', { entryId }),

  // OPML

  exportOPML: () =>
    invoke<string>('export_opml'),

  importOPML: (content: string) =>
    invoke<{ imported: number; errors: string[] }>('import_opml', { content }),

  // Settings

  getSetting: (key: string) =>
    invoke<string | null>('get_setting', { key }),

  setSetting: (key: string, value: string) =>
    invoke('set_setting', { key, value }),

  // Feed management

  refreshAll: () =>
    invoke('refresh_all_feeds'),

  refreshFeed: (feedId: string) =>
    invoke('refresh_feed', { feedId }),

  // System

  openExternal: (url: string) =>
    open(url),

  getPlatform: () =>
    invoke<string>('get_platform'),

  isDev: () =>
    invoke<boolean>('is_dev'),

  // Storage location

  getCurrentDbPath: () =>
    invoke<string>('get_current_db_path'),

  getDbSize: () =>
    invoke<number>('get_db_size'),

  getDefaultDbPath: () =>
    invoke<string>('get_default_db_path'),

  checkDbExists: (dir: string) =>
    invoke<{ exists: boolean; path: string }>('check_db_exists', { dir }),

  moveDb: (newDir: string, mode: 'replace' | 'use-existing') =>
    invoke('move_database', { newDir, mode }),

  selectFolder: () =>
    invoke<string | null>('select_folder'),

  // Import progress

  onImportProgress: (callback: (data: { total: number; imported: number; errors: number }) => void) => {
    const unlisten = listen<{ total: number; imported: number; errors: number }>('opml-import-progress', (event) => {
      callback(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  },

  // Cleanup

  runCleanupNow: () =>
    invoke<number>('run_cleanup_now'),

  // Updates (via Tauri updater plugin)

  getVersion: () =>
    invoke<string>('get_version'),

  checkForUpdates: () =>
    invoke('check_for_updates'),

  downloadUpdate: () =>
    invoke('download_update'),

  installUpdate: () =>
    invoke('install_update'),

  // Update event listeners (via Tauri events)

  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes: string }) => void) => {
    const unlisten = listen<{ version: string; releaseDate: string; releaseNotes: string }>('update-available', (event) => {
      callback(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  },

  onUpdateNotAvailable: (callback: () => void) => {
    const unlisten = listen('update-not-available', () => {
      callback()
    })
    return () => { unlisten.then(fn => fn()) }
  },

  onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) => {
    const unlisten = listen<{ percent: number; bytesPerSecond: number; total: number; transferred: number }>('update-download-progress', (event) => {
      callback(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  },

  onUpdateDownloaded: (callback: () => void) => {
    const unlisten = listen('update-downloaded', () => {
      callback()
    })
    return () => { unlisten.then(fn => fn()) }
  },

  onUpdateError: (callback: (error: string) => void) => {
    const unlisten = listen<string>('update-error', (event) => {
      callback(event.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  },
}
