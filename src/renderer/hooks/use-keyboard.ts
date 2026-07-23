import { useEffect } from 'react'
import { useArticleStore } from '../stores/article-store'
import { useFeedStore } from '../stores/feed-store'
import { useAppStore } from '../stores/app-store'
import { useShallow } from 'zustand/shallow'

export function useKeyboard() {
  const {
    navigateNext, navigatePrev, selectedEntryId, selectEntry,
    entries, toggleStar, markRead,
  } = useArticleStore(useShallow((s) => ({
    navigateNext: s.navigateNext,
    navigatePrev: s.navigatePrev,
    selectedEntryId: s.selectedEntryId,
    selectEntry: s.selectEntry,
    entries: s.entries,
    toggleStar: s.toggleStar,
    markRead: s.markRead,
  })))
  const {
    refreshAll, selectAllFeeds, multiSelectedFeedIds, clearSelection,
    selectedFeedId, feeds, setEditingFeedId, selectedCategoryId,
    categories, setEditingCategoryId,
  } = useFeedStore(useShallow((s) => ({
    refreshAll: s.refreshAll,
    selectAllFeeds: s.selectAllFeeds,
    multiSelectedFeedIds: s.multiSelectedFeedIds,
    clearSelection: s.clearSelection,
    selectedFeedId: s.selectedFeedId,
    feeds: s.feeds,
    setEditingFeedId: s.setEditingFeedId,
    selectedCategoryId: s.selectedCategoryId,
    categories: s.categories,
    setEditingCategoryId: s.setEditingCategoryId,
  })))
  const {
    showAddFeedDialog, showSettingsDialog, showDeleteConfirm,
    setShowAddFeedDialog, setShowDeleteConfirm, setShowFuzzyFinder,
    showFuzzyFinder, toggleSidebar,
  } = useAppStore(useShallow((s) => ({
    showAddFeedDialog: s.showAddFeedDialog,
    showSettingsDialog: s.showSettingsDialog,
    showDeleteConfirm: s.showDeleteConfirm,
    setShowAddFeedDialog: s.setShowAddFeedDialog,
    setShowDeleteConfirm: s.setShowDeleteConfirm,
    setShowFuzzyFinder: s.setShowFuzzyFinder,
    showFuzzyFinder: s.showFuzzyFinder,
    toggleSidebar: s.toggleSidebar,
  })))

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
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              e.preventDefault()
              setShowFuzzyFinder(!showFuzzyFinder)
            } else if (!selectedEntryId) {
              e.preventDefault()
              document.querySelector<HTMLInputElement>('[placeholder="Search..."]')?.focus()
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
