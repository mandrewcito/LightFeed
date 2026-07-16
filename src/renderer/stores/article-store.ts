import { create } from 'zustand'
import { api } from '../lib/ipc-client'
import { useFeedStore } from './feed-store'
import { useAppStore } from './app-store'
import type { EntryWithFeed } from '../types'

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

  loadEntries: (reset?: boolean) => Promise<void>
  selectEntry: (entryId: string) => Promise<void>
  clearSelection: () => void
  markRead: (entryId: string) => Promise<void>
  markAllRead: (feedId?: string, categoryId?: string) => Promise<void>
  toggleStar: (entryId: string) => Promise<void>
  loadMore: () => Promise<void>
  navigateNext: () => void
  navigatePrev: () => void
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
          e.id === entryId ? { ...e, has_read: 1 } : e
        ),
        selectedEntry: state.selectedEntry?.id === entryId
          ? { ...state.selectedEntry, has_read: 1 }
          : state.selectedEntry
      }))

      const feedStore = useFeedStore.getState()
      await feedStore.loadUnreadCounts()
    }

    // Fetch full content if URL exists
    if (entry?.url) {
      try {
        const content = await api.fetchArticleContent(entry.url)
        set({ fullContent: content, loadingContent: false })
      } catch {
        set({ fullContent: entry.content || '', loadingContent: false })
      }
    } else {
      set({ fullContent: entry?.content || '', loadingContent: false })
    }
  },

  clearSelection: () => {
    set({ selectedEntryId: null, selectedEntry: null, fullContent: null })
  },

  markRead: async (entryId: string) => {
    await api.markRead(entryId)
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, has_read: 1 } : e
      )
    }))
  },

  markAllRead: async (feedId?: string, categoryId?: string) => {
    await api.markAllRead(feedId, categoryId)
    set((state) => ({
      entries: state.entries.map((e) => ({ ...e, has_read: 1 }))
    }))
    const feedStore = useFeedStore.getState()
    await feedStore.loadUnreadCounts()
  },

  toggleStar: async (entryId: string) => {
    await api.toggleStar(entryId)
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === entryId ? { ...e, starred: e.starred ? 0 : 1 } : e
      ),
      selectedEntry: state.selectedEntry?.id === entryId
        ? { ...state.selectedEntry, starred: state.selectedEntry.starred ? 0 : 1 }
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
  }
}))
