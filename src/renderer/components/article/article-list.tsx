import { useEffect, useRef, useState } from 'react'
import { useArticleStore } from '../../stores/article-store'
import { useFeedStore } from '../../stores/feed-store'
import { ArticleCard } from './article-card'
import { ContextMenu } from '../ui/context-menu'
import { useAppStore } from '../../stores/app-store'
import { RefreshCw } from 'lucide-react'
import type { EntryWithFeed } from '../../types'

export function ArticleList() {
  const entries = useArticleStore((s) => s.entries)
  const loading = useArticleStore((s) => s.loading)
  const selectedEntryId = useArticleStore((s) => s.selectedEntryId)
  const loadEntries = useArticleStore((s) => s.loadEntries)
  const loadMore = useArticleStore((s) => s.loadMore)
  const hasMore = useArticleStore((s) => s.hasMore)
  const clearCacheForEntry = useArticleStore((s) => s.clearCacheForEntry)
  const selectEntry = useArticleStore((s) => s.selectEntry)
  const viewMode = useAppStore((s) => s.viewMode)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedView = useFeedStore((s) => s.selectedView)
  const selectedFeedId = useFeedStore((s) => s.selectedFeedId)
  const selectedCategoryId = useFeedStore((s) => s.selectedCategoryId)

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    entry: EntryWithFeed
  } | null>(null)

  const handleArticleContextMenu = (e: React.MouseEvent, entry: EntryWithFeed) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, entry })
  }

  const contextMenuItems = contextMenu
    ? [
        {
          label: 'Reload content',
          icon: <RefreshCw size={14} />,
          action: () => {
            clearCacheForEntry(contextMenu.entry.id)
            selectEntry(contextMenu.entry.id)
          }
        }
      ]
    : []

  // Reload entries when view changes
  useEffect(() => {
    if (selectedView === null) return
    loadEntries(true)
  }, [selectedView, selectedFeedId, selectedCategoryId, searchQuery])

  const handleScroll = () => {
    if (!scrollRef.current || loading || !hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMore()
    }
  }

  if (entries.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
        No articles yet
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      <div className={
        viewMode === 'cards'
          ? 'grid grid-cols-1 gap-2 p-2'
          : viewMode === 'list'
          ? 'divide-y divide-zinc-200 dark:divide-zinc-800'
          : 'divide-y divide-zinc-200 dark:divide-zinc-800'
      }>
        {entries.map((entry) => (
          <ArticleCard
            key={entry.id}
            entry={entry}
            isSelected={selectedEntryId === entry.id}
            viewMode={viewMode}
            onContextMenu={handleArticleContextMenu}
          />
        ))}
      </div>
      {loading && (
        <div className="p-4 text-center text-sm text-zinc-400">Loading...</div>
      )}
      {!loading && hasMore && entries.length > 0 && (
        <div className="p-4 text-center">
          <button
            onClick={loadMore}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Load more
          </button>
        </div>
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
