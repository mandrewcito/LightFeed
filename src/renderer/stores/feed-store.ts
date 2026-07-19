import { create } from 'zustand'
import { api } from '../lib/ipc-client'
import { useArticleStore } from './article-store'
import type { FeedWithCategory, Category } from '../types'

interface FeedState {
  feeds: FeedWithCategory[]
  categories: Category[]
  unreadCounts: Record<string, number>
  selectedFeedId: string | null
  selectedCategoryId: string | null
  selectedView: 'all' | 'starred' | 'feed' | 'category' | null
  loading: boolean
  multiSelectedFeedIds: string[]

  loadFeeds: () => Promise<void>
  loadCategories: () => Promise<void>
  loadUnreadCounts: () => Promise<void>
  addFeed: (url: string, categoryId?: string) => Promise<void>
  removeFeed: (feedId: string) => Promise<void>
  removeMultipleFeeds: (feedIds: string[]) => Promise<void>
  selectAll: () => void
  selectStarred: () => void
  selectFeed: (feedId: string) => void
  selectCategory: (categoryId: string) => void
  toggleSelectFeed: (feedId: string) => void
  selectAllFeeds: () => void
  clearSelection: () => void
  refreshFeed: (feedId: string) => Promise<void>
  refreshAll: () => Promise<void>
  createCategory: (name: string) => Promise<string>
  renameCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  moveFeedToCategory: (subscriptionId: string, categoryId: string | null) => Promise<void>
  reorderFeed: (subscriptionId: string, sortOrder: number) => Promise<void>
  reorderCategories: (orderedIds: string[]) => Promise<void>
  renameFeed: (subscriptionId: string, customTitle: string | null) => Promise<void>
  editingFeedId: string | null
  setEditingFeedId: (id: string | null) => void
  editingCategoryId: string | null
  setEditingCategoryId: (id: string | null) => void
}

export const useFeedStore = create<FeedState>((set, get) => ({
  feeds: [],
  categories: [],
  unreadCounts: {},
  selectedFeedId: null,
  selectedCategoryId: null,
  selectedView: null,
  loading: false,
  multiSelectedFeedIds: [],
  editingFeedId: null,
  editingCategoryId: null,

  loadFeeds: async () => {
    set({ loading: true })
    const feeds = await api.getFeeds()
    set({ feeds, loading: false })
  },

  loadCategories: async () => {
    const categories = await api.getCategories()
    set({ categories })
  },

  loadUnreadCounts: async () => {
    const unreadCounts = await api.getUnreadCounts()
    set({ unreadCounts })
  },

  addFeed: async (url: string, categoryId?: string) => {
    await api.addFeed(url, categoryId)
    await get().loadFeeds()
    await get().loadUnreadCounts()
  },

  removeFeed: async (feedId: string) => {
    useArticleStore.getState().clearCacheForFeed(feedId)
    await api.removeFeed(feedId)
    await get().loadFeeds()
    await get().loadUnreadCounts()
  },

  removeMultipleFeeds: async (feedIds: string[]) => {
    for (const feedId of feedIds) {
      useArticleStore.getState().clearCacheForFeed(feedId)
      await api.removeFeed(feedId)
    }
    set({ multiSelectedFeedIds: [] })
    await get().loadFeeds()
    await get().loadUnreadCounts()
  },

  selectAll: () => {
    set({ selectedFeedId: null, selectedCategoryId: null, selectedView: 'all' })
  },

  selectStarred: () => {
    set({ selectedFeedId: null, selectedCategoryId: null, selectedView: 'starred' })
  },

  selectFeed: (feedId: string) => {
    set({ selectedFeedId: feedId, selectedCategoryId: null, selectedView: 'feed', multiSelectedFeedIds: [] })
  },

  toggleSelectFeed: (feedId: string) => {
    set((state) => {
      const ids = state.multiSelectedFeedIds.includes(feedId)
        ? state.multiSelectedFeedIds.filter((id) => id !== feedId)
        : [...state.multiSelectedFeedIds, feedId]
      return { multiSelectedFeedIds: ids }
    })
  },

  selectAllFeeds: () => {
    set((state) => ({
      multiSelectedFeedIds: state.feeds.map((f) => f.id)
    }))
  },

  clearSelection: () => {
    set({ multiSelectedFeedIds: [] })
  },

  selectCategory: (categoryId: string) => {
    set({ selectedFeedId: null, selectedCategoryId: categoryId, selectedView: 'category' })
  },

  refreshFeed: async (feedId: string) => {
    await api.refreshFeed(feedId)
    await get().loadUnreadCounts()
  },

  refreshAll: async () => {
    await api.refreshAll()
    await get().loadUnreadCounts()
  },

  createCategory: async (name: string) => {
    const id = await api.createCategory(name)
    await get().loadCategories()
    return id
  },

  renameCategory: async (id: string, name: string) => {
    await api.renameCategory(id, name)
    await get().loadCategories()
  },

  deleteCategory: async (id: string) => {
    await api.deleteCategory(id)
    await get().loadCategories()
    await get().loadFeeds()
  },

  moveFeedToCategory: async (subscriptionId: string, categoryId: string | null) => {
    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.subscription_id === subscriptionId
          ? { ...f, category_id: categoryId }
          : f
      )
    }))
    await api.moveFeedToCategory(subscriptionId, categoryId)
  },

  reorderFeed: async (subscriptionId: string, sortOrder: number) => {
    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.subscription_id === subscriptionId
          ? { ...f, sort_order: sortOrder }
          : f
      ).sort((a, b) => {
        if (a.category_id !== b.category_id) return (a.category_id ?? 'zzz').localeCompare(b.category_id ?? 'zzz')
        return a.sort_order - b.sort_order
      })
    }))
    await api.reorderFeed(subscriptionId, sortOrder)
  },

  reorderCategories: async (orderedIds: string[]) => {
    const items = orderedIds.map((id, i) => ({ id, sort_order: i }))
    set((state) => ({
      categories: items.map((item) =>
        state.categories.find((c) => c.id === item.id)!
      ).filter(Boolean).map((c, i) => ({ ...c, sort_order: i }))
    }))
    await api.bulkReorderCategories(items)
  },

  renameFeed: async (subscriptionId: string, customTitle: string | null) => {
    await api.renameFeed(subscriptionId, customTitle)
    set((state) => ({
      feeds: state.feeds.map((f) =>
        f.subscription_id === subscriptionId
          ? { ...f, custom_title: customTitle }
          : f
      )
    }))
  },

  setEditingFeedId: (id: string | null) => set({ editingFeedId: id }),

  setEditingCategoryId: (id: string | null) => set({ editingCategoryId: id }),
}))
