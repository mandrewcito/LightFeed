import { useEffect, useRef } from 'react'
import { useArticleStore } from '../../stores/article-store'
import { useFeedStore } from '../../stores/feed-store'
import { ArticleCard } from './article-card'
import { useAppStore } from '../../stores/app-store'

export function ArticleList() {
  const entries = useArticleStore((s) => s.entries)
  const loading = useArticleStore((s) => s.loading)
  const selectedEntryId = useArticleStore((s) => s.selectedEntryId)
  const loadEntries = useArticleStore((s) => s.loadEntries)
  const loadMore = useArticleStore((s) => s.loadMore)
  const hasMore = useArticleStore((s) => s.hasMore)
  const viewMode = useAppStore((s) => s.viewMode)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedView = useFeedStore((s) => s.selectedView)
  const selectedFeedId = useFeedStore((s) => s.selectedFeedId)
  const selectedCategoryId = useFeedStore((s) => s.selectedCategoryId)

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
    </div>
  )
}
