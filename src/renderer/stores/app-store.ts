import { create } from 'zustand'
import { api } from '../lib/ipc-client'

type ViewMode = 'cards' | 'list' | 'compact'

interface AppState {
  theme: 'light' | 'dark' | 'system'
  viewMode: ViewMode
  sidebarCollapsed: boolean
  searchQuery: string
  showAddFeedDialog: boolean
  showSettingsDialog: boolean
  showDeleteConfirm: boolean
  showFuzzyFinder: boolean
  expandedCategoryIds: string[]

  initTheme: () => Promise<void>
  initExpandedCategories: () => Promise<void>
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
  toggleCategory: (id: string) => void
  setSearchQuery: (query: string) => void
  setShowAddFeedDialog: (show: boolean) => void
  setShowSettingsDialog: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
  setShowFuzzyFinder: (show: boolean) => void
}

let systemMediaQuery: MediaQueryList | null = null
let systemListener: ((e: MediaQueryListEvent) => void) | null = null

function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', prefersDark)
  } else {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }
}

function registerSystemListener() {
  unregisterSystemListener()
  systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  systemListener = (e: MediaQueryListEvent) => {
    document.documentElement.classList.toggle('dark', e.matches)
  }
  systemMediaQuery.addEventListener('change', systemListener)
}

function unregisterSystemListener() {
  if (systemMediaQuery && systemListener) {
    systemMediaQuery.removeEventListener('change', systemListener)
    systemMediaQuery = null
    systemListener = null
  }
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'system',
  viewMode: 'cards',
  sidebarCollapsed: false,
  searchQuery: '',
  showAddFeedDialog: false,
  showSettingsDialog: false,
  showDeleteConfirm: false,
  showFuzzyFinder: false,
  expandedCategoryIds: [],

  initTheme: async () => {
    try {
      const saved = await api.getSetting('theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        applyTheme(saved)
        if (saved === 'system') registerSystemListener()
        set({ theme: saved })
        return
      }
    } catch {}
    applyTheme('system')
    registerSystemListener()
    set({ theme: 'system' })
  },

  initExpandedCategories: async () => {
    try {
      const saved = await api.getSetting('expandedCategories')
      if (saved) {
        const ids = JSON.parse(saved)
        if (Array.isArray(ids)) {
          set({ expandedCategoryIds: ids })
        }
      }
    } catch {}
  },

  toggleCategory: (id) => {
    set((state) => {
      const next = state.expandedCategoryIds.includes(id)
        ? state.expandedCategoryIds.filter((i) => i !== id)
        : [...state.expandedCategoryIds, id]
      api.setSetting('expandedCategories', JSON.stringify(next)).catch(() => {})
      return { expandedCategoryIds: next }
    })
  },

  setTheme: (theme) => {
    applyTheme(theme)
    if (theme === 'system') {
      registerSystemListener()
    } else {
      unregisterSystemListener()
    }
    set({ theme })
    api.setSetting('theme', theme).catch(() => {})
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShowAddFeedDialog: (show) => set({ showAddFeedDialog: show }),

  setShowSettingsDialog: (show) => set({ showSettingsDialog: show }),

  setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show }),

  setShowFuzzyFinder: (show) => set({ showFuzzyFinder: show })
}))

applyTheme('system')
