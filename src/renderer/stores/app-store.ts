import { create } from 'zustand'

type ViewMode = 'cards' | 'list' | 'compact'

interface AppState {
  theme: 'light' | 'dark' | 'system'
  viewMode: ViewMode
  sidebarCollapsed: boolean
  searchQuery: string
  showAddFeedDialog: boolean
  showSettingsDialog: boolean
  showDeleteConfirm: boolean

  initTheme: () => Promise<void>
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
  setShowAddFeedDialog: (show: boolean) => void
  setShowSettingsDialog: (show: boolean) => void
  setShowDeleteConfirm: (show: boolean) => void
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

  initTheme: async () => {
    try {
      const saved = await window.api.getSetting('theme')
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        applyTheme(saved)
        if (saved === 'system') registerSystemListener()
        set({ theme: saved })
        return
      }
    } catch {}
applyTheme('system')
registerSystemListener()
    registerSystemListener()
    set({ theme: 'system' })
  },

  setTheme: (theme) => {
    applyTheme(theme)
    if (theme === 'system') {
      registerSystemListener()
    } else {
      unregisterSystemListener()
    }
    set({ theme })
    window.api.setSetting('theme', theme).catch(() => {})
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setShowAddFeedDialog: (show) => set({ showAddFeedDialog: show }),

  setShowSettingsDialog: (show) => set({ showSettingsDialog: show }),

  setShowDeleteConfirm: (show) => set({ showDeleteConfirm: show })
}))

applyTheme('system')
