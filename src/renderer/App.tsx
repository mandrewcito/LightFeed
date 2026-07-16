import { useEffect } from 'react'
import { useFeedStore } from './stores/feed-store'
import { useArticleStore } from './stores/article-store'
import { MainLayout } from './components/layout/main-layout'
import { AddFeedDialog } from './components/feed/add-feed-dialog'
import { SettingsDialog } from './components/settings/settings-dialog'
import { useAppStore } from './stores/app-store'
import { useKeyboard } from './hooks/use-keyboard'

export function App() {
  const loadFeeds = useFeedStore((s) => s.loadFeeds)
  const loadCategories = useFeedStore((s) => s.loadCategories)
  const loadUnreadCounts = useFeedStore((s) => s.loadUnreadCounts)
  const loadEntries = useArticleStore((s) => s.loadEntries)
  const initTheme = useAppStore((s) => s.initTheme)
  const showAddFeedDialog = useAppStore((s) => s.showAddFeedDialog)
  const showSettingsDialog = useAppStore((s) => s.showSettingsDialog)

  useKeyboard()

  useEffect(() => {
    initTheme()
    loadFeeds()
    loadCategories()
    loadUnreadCounts()
    loadEntries()
  }, [])

  return (
    <>
      <MainLayout />
      {showAddFeedDialog && <AddFeedDialog />}
      {showSettingsDialog && <SettingsDialog />}
    </>
  )
}
