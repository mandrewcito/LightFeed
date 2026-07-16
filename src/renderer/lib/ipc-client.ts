// Typed wrapper around the preload API
declare global {
  interface Window {
    api: {
      addFeed: (url: string, categoryId?: string) => Promise<{ id: string; isNew: boolean }>
      removeFeed: (feedId: string) => Promise<void>
      removeMultipleFeeds: (feedIds: string[]) => Promise<void>
      getFeeds: () => Promise<any[]>
      updateFeed: (feedId: string, updates: Record<string, unknown>) => Promise<void>
      getCategories: () => Promise<any[]>
      createCategory: (name: string) => Promise<string>
      renameCategory: (id: string, name: string) => Promise<void>
      deleteCategory: (id: string) => Promise<void>
      reorderCategory: (id: string, sortOrder: number) => Promise<void>
      bulkReorderCategories: (items: Array<{ id: string; sort_order: number }>) => Promise<void>
      moveFeedToCategory: (subscriptionId: string, categoryId: string | null) => Promise<void>
      reorderFeed: (subscriptionId: string, sortOrder: number) => Promise<void>
      getEntries: (filter: any) => Promise<any[]>
      getEntry: (entryId: string) => Promise<any>
      markRead: (entryId: string) => Promise<void>
      markAllRead: (feedId?: string, categoryId?: string) => Promise<void>
      toggleStar: (entryId: string) => Promise<void>
      getUnreadCounts: () => Promise<Record<string, number>>
      fetchArticleContent: (url: string) => Promise<string>
      exportOPML: () => Promise<string>
      importOPML: (content: string) => Promise<{ imported: number; errors: string[] }>
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<void>
      refreshAll: () => Promise<void>
      refreshFeed: (feedId: string) => Promise<void>
      openExternal: (url: string) => Promise<void>
      getPlatform: () => Promise<string>
      isDev: () => Promise<boolean>
      getCurrentDbPath: () => Promise<string>
      getDefaultDbPath: () => Promise<string>
      checkDbExists: (dir: string) => Promise<{ exists: boolean; path: string }>
      moveDb: (newDir: string, mode: 'replace' | 'use-existing') => Promise<void>
      selectFolder: () => Promise<string | null>
      runCleanupNow: () => Promise<number>
      onImportProgress: (callback: (data: { total: number; imported: number; errors: number }) => void) => void
      getVersion: () => Promise<string>
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateAvailable: (callback: (info: { version: string; releaseDate: string; releaseNotes: string }) => void) => void
      onUpdateNotAvailable: (callback: () => void) => void
      onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; total: number; transferred: number }) => void) => void
      onUpdateDownloaded: (callback: () => void) => void
      onUpdateError: (callback: (error: string) => void) => void
    }
  }
}

export const api = window.api
