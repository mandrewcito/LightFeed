import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useFeedStore } from './stores/feed-store'
import { MainLayout } from './components/layout/main-layout'
import { AddFeedDialog } from './components/feed/add-feed-dialog'
import { SettingsDialog } from './components/settings/settings-dialog'
import { FuzzyFinder } from './components/ui/fuzzy-finder'
import { useAppStore } from './stores/app-store'
import { useKeyboard } from './hooks/use-keyboard'

export function App() {
  const loadFeeds = useFeedStore((s) => s.loadFeeds)
  const loadCategories = useFeedStore((s) => s.loadCategories)
  const loadUnreadCounts = useFeedStore((s) => s.loadUnreadCounts)
  const initTheme = useAppStore((s) => s.initTheme)
  const initExpandedCategories = useAppStore((s) => s.initExpandedCategories)
  const showAddFeedDialog = useAppStore((s) => s.showAddFeedDialog)
  const showSettingsDialog = useAppStore((s) => s.showSettingsDialog)

  useKeyboard()

  useEffect(() => {
    initTheme()
    initExpandedCategories()
    loadFeeds()
    loadCategories()
    loadUnreadCounts()

    const unlisten = listen('feeds-refreshed', () => {
      loadUnreadCounts()
    })

    const unlistenShortcut = listen('toggle-fuzzy-finder', () => {
      const current = useAppStore.getState().showFuzzyFinder
      useAppStore.getState().setShowFuzzyFinder(!current)
    })

    return () => {
      unlisten.then((fn) => fn())
      unlistenShortcut.then((fn) => fn())
    }
  }, [])

  return (
    <>
      <MainLayout />
      {showAddFeedDialog && <AddFeedDialog />}
      {showSettingsDialog && <SettingsDialog />}
      <FuzzyFinder />
    </>
  )
}
