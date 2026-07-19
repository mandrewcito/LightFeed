import { useArticleStore } from '../../stores/article-store'
import { timeAgo, stripHtml, truncate } from '../../lib/utils'
import { Star } from 'lucide-react'
import type { EntryWithFeed } from '../../types'

interface ArticleCardProps {
  entry: EntryWithFeed
  isSelected: boolean
  viewMode: 'cards' | 'list' | 'compact'
  onContextMenu?: (e: React.MouseEvent, entry: EntryWithFeed) => void
}

export function ArticleCard({ entry, isSelected, viewMode, onContextMenu }: ArticleCardProps) {
  const selectEntry = useArticleStore((s) => s.selectEntry)

  const snippet = entry.content ? truncate(stripHtml(entry.content), viewMode === 'compact' ? 80 : 150) : ''

  if (viewMode === 'compact') {
    return (
      <div
        onClick={() => selectEntry(entry.id)}
        onContextMenu={(e) => onContextMenu?.(e, entry)}
        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-2 border-transparent'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm truncate ${!entry.has_read ? 'font-medium' : ''}`}>
              {entry.title || 'Untitled'}
            </h3>
            {entry.starred ? <Star size={12} className="text-yellow-500 fill-yellow-500 shrink-0" /> : null}
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {entry.feed_image_url && (
              <img src={entry.feed_image_url} alt="" className="w-3 h-3 rounded-sm" />
            )}
            <span>{entry.feed_title}</span>
            <span>·</span>
            <span>{timeAgo(entry.published_at)}</span>
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => selectEntry(entry.id)}
        onContextMenu={(e) => onContextMenu?.(e, entry)}
        className={`flex gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-2 border-transparent'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm truncate ${!entry.has_read ? 'font-semibold' : ''}`}>
              {entry.title || 'Untitled'}
            </h3>
            {entry.starred ? <Star size={12} className="text-yellow-500 fill-yellow-500 shrink-0" /> : null}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">{snippet}</p>
          <div className="flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {entry.feed_image_url && (
              <img src={entry.feed_image_url} alt="" className="w-3 h-3 rounded-sm" />
            )}
            <span>{entry.feed_title}</span>
            <span>·</span>
            <span>{timeAgo(entry.published_at)}</span>
            {entry.author && (
              <>
                <span>·</span>
                <span>{entry.author}</span>
              </>
            )}
          </div>
        </div>
        {entry.thumbnail && (
          <img
            src={entry.thumbnail}
            alt=""
            className="w-16 h-16 object-cover rounded shrink-0"
          />
        )}
      </div>
    )
  }

  // Cards view
  return (
    <div
      onClick={() => selectEntry(entry.id)}
      onContextMenu={(e) => onContextMenu?.(e, entry)}
      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/30'
          : 'bg-white dark:bg-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {entry.feed_image_url && (
            <img src={entry.feed_image_url} alt="" className="w-4 h-4 rounded-sm" />
          )}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.feed_title}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">·</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{timeAgo(entry.published_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          <h3 className={`text-sm leading-snug ${!entry.has_read ? 'font-semibold' : ''}`}>
            {entry.title || 'Untitled'}
          </h3>
          {entry.starred ? <Star size={12} className="text-yellow-500 fill-yellow-500 shrink-0" /> : null}
        </div>
        {snippet && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 line-clamp-2">{snippet}</p>
        )}
      </div>
      {entry.thumbnail && (
        <img
          src={entry.thumbnail}
          alt=""
          className="w-20 h-20 object-cover rounded-lg shrink-0"
        />
      )}
    </div>
  )
}
