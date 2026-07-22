import { create } from 'zustand'
import { api } from '../lib/ipc-client'
import { useFeedStore } from './feed-store'
import { useAppStore } from './app-store'
import { isYouTubeUrl } from '../lib/utils'
import type { EntryWithFeed } from '../types'

const DOWNLOAD_BATCH_SIZE = 100

async function fetchAllEntriesBatched(filter: Record<string, unknown>, batchSize = DOWNLOAD_BATCH_SIZE): Promise<EntryWithFeed[]> {
  const all: EntryWithFeed[] = []
  let offset = 0
  while (true) {
    const batch = await api.getEntries({ ...filter, limit: batchSize, offset })
    all.push(...batch)
    if (batch.length < batchSize) break
    offset += batch.length
  }
  return all
}

async function batchDownloadEntries(
  entries: EntryWithFeed[],
  localCache: Record<string, string>,
  onProgress?: (current: number, total: number) => void,
): Promise<Record<string, string>> {
  let current = 0
  for (const entry of entries) {
    if (!entry.url || isYouTubeUrl(entry.url)) {
      current++
      onProgress?.(current, entries.length)
      continue
    }
    const dbContent = await api.getEntryContent(entry.id)
    if (!dbContent) {
      try {
        const content = await api.fetchArticleContent(entry.url)
        await api.saveEntryContent(entry.id, content)
        localCache[entry.url] = content
      } catch {}
    }
    current++
    onProgress?.(current, entries.length)
  }
  return localCache
}

interface ArticleState {
  entries: EntryWithFeed[]
  selectedEntryId: string | null
  selectedEntry: EntryWithFeed | null
  loading: boolean
  total: number
  offset: number
  hasMore: boolean
  fullContent: string | null
  loadingContent: boolean
  contentCache: Record<string, string>
  downloading: boolean

  loadEntries: (reset?: boolean) => Promise<void>
  selectEntry: (entryId: string) => Promise<void>
  clearSelection: () => void
  clearCacheForFeed: (feedId: string) => void
  clearCacheForEntry: (entryId: string) => void
  markRead: (entryId: string) => Promise<void>
  markAllRead: (feedId?: string, categoryId?: string) => Promise<void>
  toggleStar: (entryId: string) => Promise<void>
  loadMore: () => Promise<void>
  navigateNext: () => void
  navigatePrev: () => void
  downloadFeedContent: (feedId: string, onProgress?: (current: number, total: number) => void) => Promise<void>
  downloadAllContent: (onProgress?: (current: number, total: number) => void) => Promise<void>
}

export const useArticleStore = create<ArticleState>((set, get) => ({
  entries: [],
  selectedEntryId: null,
  selectedEntry: null,
  loading: false,
  total: 0,
  offset: 0,
  hasMore: true,
  fullContent: null,
  loadingContent: false,
  contentCache: {},
  downloading: false,

  loadEntries: async (reset = true) => {
    const { offset } = get()
    set({ loading: true })

    const feedStore = useFeedStore.getState()
    const filter: Record<string, unknown> = {
      limit: 50,
      offset: reset ? 0 : offset
    }

    if (feedStore.selectedView === 'feed' && feedStore.selectedFeedId) {
      filter.feed_id = feedStore.selectedFeedId
    } else if (feedStore.selectedView === 'category' && feedStore.selectedCategoryId) {
      filter.category_id = feedStore.selectedCategoryId
    } else if (feedStore.selectedView === 'starred') {
      filter.starred = true
    }

    const appStore = useAppStore.getState()
    if (appStore.searchQuery) filter.search = appStore.searchQuery

    const results = await api.getEntries(filter)

    set((state) => ({
      entries: reset ? results : [...state.entries, ...results],
      total: results.length,
      offset: reset ? results.length : state.offset + results.length,
      hasMore: results.length === 50,
      loading: false
    }))
  },

  selectEntry: async (entryId: string) => {
    set({ selectedEntryId: entryId, fullContent: null, loadingContent: true })

    const entry = get().entries.find((e) => e.id === entryId) || null
    set({ selectedEntry: entry })

    // Mark as read
    if (entry && !entry.has_read) {
      await api.markRead(entryId)
      set((state) => ({
        entries: state.entries.map((e) =>
          e.id === entryId ? { ...e, has_read: true } : e
        ),
        selectedEntry: state.selectedEntry?.id === entryId
          ? { ...state.selectedEntry, has_read: true }
          : state.selectedEntry
      }))

      const feedStore = useFeedStore.getState()
      await feedStore.loadUnreadCounts()
    }

    // Fetch full content if URL exists (skip for YouTube - handled by reader)
    if (entry?.url && !isYouTubeUrl(entry.url)) {
      // Check in-memory cache first
      const cached = entry.url ? get().contentCache[entry.url] : undefined
      if (cached) {
        set({ fullContent: cached, loadingContent: false })
      } else {
        // Check DB cache
        try {
          const dbContent = await api.getEntryContent(entryId)
          if (dbContent) {
            set((state) => {
              return { fullContent: dbContent, loadingContent: false, contentCache: { ...state.contentCache, [entry.url!]: dbContent } }
            })
          } else {
            // Fetch from network
            const content = await api.fetchArticleContent(entry.url)
            // Save to DB
            api.saveEntryContent(entryId, content).catch(() => {})
            set((state) => {
              return { fullContent: content, loadingContent: false, contentCache: { ...state.contentCache, [entry.url!]: content } }
            })
          }
        } catch {
          set({ fullContent: entry.content || '', loadingContent: false })
        }
      }
    } else {
      set({ fullContent: entry?.content || '', loadingContent: false })
    }
  },

  clearSelection: () => {
    set({ selectedEntryId: null, selectedEntry: null, fullContent: null })
  },

  clearCacheForFeed: (feedId: string) => {
    const { entries, contentCache } = get()
    const feedEntryUrls = entries
      .filter((e) => e.feed_id === feedId)
      .map((e) => e.url)
      .filter((url): url is string => !!url)
    if (feedEntryUrls.length === 0) return
    const newCache = { ...contentCache }
    for (const url of feedEntryUrls) {
      delete newCache[url]
    }
    set({ contentCache: newCache })
  },

  clearCacheForEntry: (entryId: string) => {
    const { entries, contentCache } = get()
    const entry = entries.find((e) => e.id === entryId)
    if (!entry?.url) return
    const newCache = { ...contentCache }
    delete newCache[entry.url]
    set({ contentCache: newCache })
  },

  markRead: async (entryId: string) => {
    await api.markRead(entryId)
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, has_read: true } : e
      )
    }))
    const feedStore = useFeedStore.getState()
    await feedStore.loadUnreadCounts()
  },

  markAllRead: async (feedId?: string, categoryId?: string) => {
    await api.markAllRead(feedId, categoryId)
    set((state) => ({
      entries: state.entries.map((e) => ({ ...e, has_read: true }))
    }))
    const feedStore = useFeedStore.getState()
    await feedStore.loadUnreadCounts()
  },

  toggleStar: async (entryId: string) => {
    await api.toggleStar(entryId)
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, starred: !e.starred } : e
      ),
      selectedEntry: state.selectedEntry?.id === entryId
        ? { ...state.selectedEntry, starred: !state.selectedEntry.starred }
        : state.selectedEntry
    }))
  },

  loadMore: async () => {
    await get().loadEntries(false)
  },

  navigateNext: () => {
    const { entries, selectedEntryId } = get()
    if (!selectedEntryId) return
    const idx = entries.findIndex((e) => e.id === selectedEntryId)
    if (idx < entries.length - 1) {
      get().selectEntry(entries[idx + 1].id)
    }
  },

  navigatePrev: () => {
    const { entries, selectedEntryId } = get()
    if (!selectedEntryId) return
    const idx = entries.findIndex((e) => e.id === selectedEntryId)
    if (idx > 0) {
      get().selectEntry(entries[idx - 1].id)
    }
  },

  downloadFeedContent: async (feedId, onProgress) => {
    set({ downloading: true })
    const results = await fetchAllEntriesBatched({ feed_id: feedId })
    const localCache = { ...get().contentCache }
    await batchDownloadEntries(results, localCache, onProgress)
    set({ contentCache: localCache, downloading: false })
  },

  downloadAllContent: async (onProgress) => {
    set({ downloading: true })
    const feeds = useFeedStore.getState().feeds
    const feedEntries: EntryWithFeed[] = []
    const uniqueUrls = new Set<string>()
    for (const feed of feeds) {
      const entries = await fetchAllEntriesBatched({ feed_id: feed.feed_id, unread_only: true })
      for (const e of entries) {
        if (e.url && !uniqueUrls.has(e.url)) {
          uniqueUrls.add(e.url)
          feedEntries.push(e)
        }
      }
    }
    const localCache = { ...get().contentCache }
    await batchDownloadEntries(feedEntries, localCache, onProgress)
    set({ contentCache: localCache, downloading: false })
  }
}))
