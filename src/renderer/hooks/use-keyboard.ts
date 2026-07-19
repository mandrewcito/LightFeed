import { useEffect } from 'react'
import { useArticleStore } from '../stores/article-store'
import { useFeedStore } from '../stores/feed-store'
import { useAppStore } from '../stores/app-store'

export function useKeyboard() {
  const navigateNext = useArticleStore((s) => s.navigateNext)
  const navigatePrev = useArticleStore((s) => s.navigatePrev)
  const selectedEntryId = useArticleStore((s) => s.selectedEntryId)
  const selectEntry = useArticleStore((s) => s.selectEntry)
  const entries = useArticleStore((s) => s.entries)
  const toggleStar = useArticleStore((s) => s.toggleStar)
  const markRead = useArticleStore((s) => s.markRead)
  const refreshAll = useFeedStore((s) => s.refreshAll)
  const selectAllFeeds = useFeedStore((s) => s.selectAllFeeds)
  const multiSelectedFeedIds = useFeedStore((s) => s.multiSelectedFeedIds)
  const clearSelection = useFeedStore((s) => s.clearSelection)
  const selectedFeedId = useFeedStore((s) => s.selectedFeedId)
  const feeds = useFeedStore((s) => s.feeds)
  const setEditingFeedId = useFeedStore((s) => s.setEditingFeedId)
  const selectedCategoryId = useFeedStore((s) => s.selectedCategoryId)
  const categories = useFeedStore((s) => s.categories)
  const setEditingCategoryId = useFeedStore((s) => s.setEditingCategoryId)
  const showAddFeedDialog = useAppStore((s) => s.showAddFeedDialog)
  const showSettingsDialog = useAppStore((s) => s.showSettingsDialog)
  const showDeleteConfirm = useAppStore((s) => s.showDeleteConfirm)
  const setShowAddFeedDialog = useAppStore((s) => s.setShowAddFeedDialog)
  const setShowDeleteConfirm = useAppStore((s) => s.setShowDeleteConfirm)
  const setShowFuzzyFinder = useAppStore((s) => s.setShowFuzzyFinder)
  const showFuzzyFinder = useAppStore((s) => s.showFuzzyFinder)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case 'Escape':
          if (!showAddFeedDialog && !showSettingsDialog && !showDeleteConfirm && multiSelectedFeedIds.length > 0) {
            e.preventDefault()
            clearSelection()
          }
          break
        case 'j':
        case 'ArrowDown':
          e.preventDefault()
          if (selectedEntryId) {
            navigateNext()
          } else if (entries.length > 0) {
            selectEntry(entries[0].id)
          }
          break
        case 'k':
        case 'ArrowUp':
          e.preventDefault()
          if (selectedEntryId) {
            navigatePrev()
          }
          break
        case 'm':
          if (selectedEntryId) {
            e.preventDefault()
            markRead(selectedEntryId)
          }
          break
        case 's':
          if (selectedEntryId) {
            e.preventDefault()
            toggleStar(selectedEntryId)
          }
          break
        case 'r':
          e.preventDefault()
          refreshAll()
          break
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectAllFeeds()
          } else {
            e.preventDefault()
            setShowAddFeedDialog(true)
          }
          break
        case '/':
          e.preventDefault()
          document.querySelector<HTMLInputElement>('[placeholder="Search..."]')?.focus()
          break
        case 'f':
          if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
            if (!selectedEntryId) {
              e.preventDefault()
              document.querySelector<HTMLInputElement>('[placeholder="Search..."]')?.focus()
            }
          }
          break
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              e.preventDefault()
              setShowFuzzyFinder(!showFuzzyFinder)
            }
          }
          break
        case 'b':
          e.preventDefault()
          toggleSidebar()
          break
        case 'Delete':
        case 'Backspace':
          if (multiSelectedFeedIds.length >= 2) {
            e.preventDefault()
            setShowDeleteConfirm(true)
          }
          break
        case 'F2':
          if (selectedFeedId) {
            e.preventDefault()
            const feed = feeds.find((f) => f.id === selectedFeedId)
            if (feed) {
              setEditingFeedId(feed.subscription_id)
            }
          } else if (selectedCategoryId) {
            e.preventDefault()
            const cat = categories.find((c) => c.id === selectedCategoryId)
            if (cat) {
              setEditingCategoryId(cat.id)
            }
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEntryId, entries, multiSelectedFeedIds, clearSelection, showAddFeedDialog, showSettingsDialog, showDeleteConfirm, selectedFeedId, feeds, setEditingFeedId, selectedCategoryId, categories, setEditingCategoryId, showFuzzyFinder, setShowFuzzyFinder])
}
