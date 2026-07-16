import { useState } from 'react'
import { RefreshCw, Trash2, GripVertical } from 'lucide-react'
import { useFeedStore } from '../../stores/feed-store'
import type { FeedWithCategory } from '../../types'

interface FeedItemProps {
  feed: FeedWithCategory
  unreadCount: number
  isSelected: boolean
  isMultiSelected: boolean
  onSelect: () => void
  onMultiSelect: () => void
  onRemove: () => void
}

export function FeedItem({ feed, unreadCount, isSelected, isMultiSelected, onSelect, onMultiSelect, onRemove }: FeedItemProps) {
  const refreshFeed = useFeedStore((s) => s.refreshFeed)
  const [refreshing, setRefreshing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setRefreshing(true)
    await refreshFeed(feed.id)
    setRefreshing(false)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Remove "${feed.title || feed.url}"?`)) {
      onRemove()
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'feed',
      feedId: feed.id,
      subscriptionId: feed.subscription_id
    }))
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.stopPropagation()
      onMultiSelect()
    } else if (isMultiSelected) {
      onMultiSelect()
    } else {
      onSelect()
    }
  }

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`group flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer transition-colors ${
        isDragging ? 'opacity-40' : ''
      } ${
        isMultiSelected
          ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-500/40'
          : isSelected
          ? 'bg-zinc-200 dark:bg-zinc-700'
          : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
      }`}
    >
      <GripVertical size={10} className="text-zinc-400 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
      {feed.image_url ? (
        <img src={feed.image_url} alt="" className="w-4 h-4 rounded-sm shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-sm bg-zinc-300 dark:bg-zinc-600 shrink-0" />
      )}
      <span className={`flex-1 truncate ${unreadCount > 0 ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
        {feed.custom_title || feed.title || feed.url}
      </span>
      {unreadCount > 0 && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{unreadCount}</span>
      )}
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          onClick={handleRefresh}
          className="p-0.5 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
        >
          <RefreshCw size={10} className={`text-zinc-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={handleRemove}
          className="p-0.5 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
        >
          <Trash2 size={10} className="text-zinc-400" />
        </button>
      </div>
    </div>
  )
}
