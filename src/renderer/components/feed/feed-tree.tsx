import { useState } from 'react'
import { useFeedStore } from '../../stores/feed-store'
import { useAppStore } from '../../stores/app-store'
import { FeedItem } from './feed-item'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Plus, Trash2, Pencil, Copy, Download } from 'lucide-react'
import { ContextMenu } from '../ui/context-menu'
import { useArticleStore } from '../../stores/article-store'
import type { FeedWithCategory } from '../../types'

export function FeedTree() {
  const feeds = useFeedStore((s) => s.feeds)
  const categories = useFeedStore((s) => s.categories)
  const unreadCounts = useFeedStore((s) => s.unreadCounts)
  const selectFeed = useFeedStore((s) => s.selectFeed)
  const selectCategory = useFeedStore((s) => s.selectCategory)
  const selectedFeedId = useFeedStore((s) => s.selectedFeedId)
  const selectedCategoryId = useFeedStore((s) => s.selectedCategoryId)
  const createCategory = useFeedStore((s) => s.createCategory)
  const renameCategory = useFeedStore((s) => s.renameCategory)
  const deleteCategory = useFeedStore((s) => s.deleteCategory)
  const removeFeed = useFeedStore((s) => s.removeFeed)
  const moveFeedToCategory = useFeedStore((s) => s.moveFeedToCategory)
  const toggleSelectFeed = useFeedStore((s) => s.toggleSelectFeed)
  const clearSelection = useFeedStore((s) => s.clearSelection)
  const multiSelectedFeedIds = useFeedStore((s) => s.multiSelectedFeedIds)
  const editingFeedId = useFeedStore((s) => s.editingFeedId)
  const setEditingFeedId = useFeedStore((s) => s.setEditingFeedId)
  const renameFeed = useFeedStore((s) => s.renameFeed)
  const editingCategoryId = useFeedStore((s) => s.editingCategoryId)
  const setEditingCategoryId = useFeedStore((s) => s.setEditingCategoryId)
  const selectedView = useFeedStore((s) => s.selectedView)
  const loadEntries = useArticleStore((s) => s.loadEntries)
  const expandedCategoryIds = useAppStore((s) => s.expandedCategoryIds)
  const toggleCategoryExpand = useAppStore((s) => s.toggleCategory)

  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editCategoryName, setEditCategoryName] = useState('')
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)
  const [dragOverUncategorized, setDragOverUncategorized] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; feed: FeedWithCategory } | null>(null)
  const [downloadingFeed, setDownloadingFeed] = useState<{ feedId: string; current: number; total: number } | null>(null)

  const toggleCategory = (id: string) => {
    toggleCategoryExpand(id)
    if (selectedView === 'category') {
      const { selectedCategoryId } = useFeedStore.getState()
      if (selectedCategoryId === id) {
        loadEntries(true)
      }
    }
  }

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      const id = await createCategory(newCategoryName.trim())
      toggleCategoryExpand(id)
      setNewCategoryName('')
      setCreatingCategory(false)
    }
  }

  const handleRenameCategory = async (id: string) => {
    if (editCategoryName.trim()) {
      await renameCategory(id, editCategoryName.trim())
      setEditingCategoryId(null)
    }
  }

  const parseDragData = (e: React.DragEvent): { type: string; feedId: string; subscriptionId: string } | null => {
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      if (data.type === 'feed' && data.subscriptionId) return data
    } catch {}
    return null
  }

  const handleCategoryDragOver = (e: React.DragEvent, catId: string) => {
    if (!e.dataTransfer.types.includes('application/json')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCategoryId(catId)
    setDragOverUncategorized(false)
  }

  const handleCategoryDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverCategoryId(null)
    }
  }

  const handleCategoryDrop = async (e: React.DragEvent, catId: string) => {
    e.preventDefault()
    setDragOverCategoryId(null)
    const data = parseDragData(e)
    if (!data) return
    if (data.subscriptionId) {
      await moveFeedToCategory(data.subscriptionId, catId)
    }
  }

  const handleUncategorizedDragOver = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('application/json')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverUncategorized(true)
    setDragOverCategoryId(null)
  }

  const handleUncategorizedDragLeave = (e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverUncategorized(false)
    }
  }

  const handleUncategorizedDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverUncategorized(false)
    const data = parseDragData(e)
    if (!data) return
    if (data.subscriptionId) {
      await moveFeedToCategory(data.subscriptionId, null)
    }
  }

  const handleFeedContextMenu = (e: React.MouseEvent, feed: FeedWithCategory) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, feed })
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const handleDeleteFeed = (feed: FeedWithCategory) => {
    if (confirm(`Remove "${feed.title || feed.url}"?`)) {
      removeFeed(feed.id)
    }
  }

  const handleDownloadNews = async (feed: FeedWithCategory) => {
    if (downloadingFeed) return
    const downloadFeedContent = useArticleStore.getState().downloadFeedContent
    setDownloadingFeed({ feedId: feed.id, current: 0, total: 0 })
    await downloadFeedContent(feed.id, (current, total) => {
      setDownloadingFeed((prev) => prev ? { ...prev, current, total } : null)
    })
    setDownloadingFeed(null)
  }

  const handleRenameSubmit = async (subscriptionId: string, title: string | null) => {
    await renameFeed(subscriptionId, title)
    setEditingFeedId(null)
  }

  const uncategorizedFeeds = feeds.filter((f) => !f.category_id)

  const contextMenuItems = contextMenu ? [
    {
      label: 'Rename',
      icon: <Pencil size={14} />,
      action: () => setEditingFeedId(contextMenu.feed.subscription_id),
    },
    {
      label: 'Copy link',
      icon: <Copy size={14} />,
      action: () => handleCopyLink(contextMenu.feed.url),
    },
    {
      label: 'Download news',
      icon: <Download size={14} />,
      action: () => handleDownloadNews(contextMenu.feed),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      action: () => handleDeleteFeed(contextMenu.feed),
      variant: 'danger' as const,
    },
  ] : []

  return (
    <div className="space-y-0.5">
      {/* Categories */}
      {categories.map((cat) => {
        const isExpanded = expandedCategoryIds.includes(cat.id)
        const catFeeds = feeds.filter((f) => f.category_id === cat.id)
        const catUnread = catFeeds.reduce((sum, f) => sum + (unreadCounts[f.id] || 0), 0)
        const isDragOver = dragOverCategoryId === cat.id

        return (
          <div key={cat.id}>
            <div
              onDragOver={(e) => handleCategoryDragOver(e, cat.id)}
              onDragLeave={handleCategoryDragLeave}
              onDrop={(e) => handleCategoryDrop(e, cat.id)}
              className={`group flex items-center gap-1 px-2 py-1 rounded text-sm cursor-pointer transition-all ${
                isDragOver
                  ? 'ring-1 ring-blue-500/50 bg-blue-50 dark:bg-blue-900/20'
                  : selectedCategoryId === cat.id
                  ? 'bg-zinc-200 dark:bg-zinc-700'
                  : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
              }`}
            >
              <button
                onClick={() => toggleCategory(cat.id)}
                className="p-0.5 -ml-0.5"
              >
                {isExpanded ? (
                  <ChevronDown size={12} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={12} className="text-zinc-400" />
                )}
              </button>
              <button
                onClick={() => {
                  toggleCategory(cat.id)
                  selectCategory(cat.id)
                }}
                className="flex items-center gap-1.5 flex-1 text-left"
              >
                {isExpanded ? (
                  <FolderOpen size={14} className="text-zinc-400" />
                ) : (
                  <Folder size={14} className="text-zinc-400" />
                )}
                {editingCategoryId === cat.id ? (
                  <input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    onBlur={() => handleRenameCategory(cat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCategory(cat.id)
                      if (e.key === 'Escape') setEditingCategoryId(null)
                    }}
                    autoFocus
                    className="flex-1 bg-transparent border-b border-zinc-400 outline-none text-sm"
                  />
                ) : (
                  <span className="flex-1 truncate text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                )}
                {catUnread > 0 && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{catUnread}</span>
                )}
              </button>
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCategoryId(cat.id)
                    setEditCategoryName(cat.name)
                  }}
                  className="p-0.5 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  title="Rename category"
                >
                  <Pencil size={10} className="text-zinc-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete category "${cat.name}"? Feeds inside will be moved to Uncategorized.`)) {
                      deleteCategory(cat.id)
                    }
                  }}
                  className="p-0.5 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  title="Delete category"
                >
                  <Trash2 size={10} className="text-zinc-400" />
                </button>
              </div>
            </div>
            {isExpanded && (
              <div className="ml-4">
                {catFeeds.map((feed) => (
                  <div key={feed.id}>
                    <FeedItem
                      feed={feed}
                      unreadCount={unreadCounts[feed.id] || 0}
                      isSelected={selectedFeedId === feed.id}
                      isMultiSelected={multiSelectedFeedIds.includes(feed.id)}
                      isEditing={editingFeedId === feed.subscription_id}
                      onSelect={() => selectFeed(feed.id)}
                      onMultiSelect={() => toggleSelectFeed(feed.id)}
                      onRemove={() => removeFeed(feed.id)}
                      onContextMenu={(e) => handleFeedContextMenu(e, feed)}
                      onRenameSubmit={(title) => handleRenameSubmit(feed.subscription_id, title)}
                    />
                    {downloadingFeed && downloadingFeed.feedId === feed.id && downloadingFeed.total > 0 && (
                      <div className="px-2 py-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                          <span>Caching...</span>
                          <span>{downloadingFeed.current}/{downloadingFeed.total}</span>
                        </div>
                        <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-300"
                            style={{ width: `${(downloadingFeed.current / downloadingFeed.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Uncategorized feeds - drop zone */}
      <div
        onDragOver={handleUncategorizedDragOver}
        onDragLeave={handleUncategorizedDragLeave}
        onDrop={handleUncategorizedDrop}
        className={`rounded transition-all ${
          dragOverUncategorized
            ? 'ring-1 ring-blue-500/50 bg-blue-50 dark:bg-blue-900/20 p-1'
            : uncategorizedFeeds.length === 0 ? '' : 'p-0'
        }`}
      >
        {uncategorizedFeeds.map((feed) => (
          <div key={feed.id}>
            <FeedItem
              feed={feed}
              unreadCount={unreadCounts[feed.id] || 0}
              isSelected={selectedFeedId === feed.id}
              isMultiSelected={multiSelectedFeedIds.includes(feed.id)}
              isEditing={editingFeedId === feed.subscription_id}
              onSelect={() => selectFeed(feed.id)}
              onMultiSelect={() => toggleSelectFeed(feed.id)}
              onRemove={() => removeFeed(feed.id)}
              onContextMenu={(e) => handleFeedContextMenu(e, feed)}
              onRenameSubmit={(title) => handleRenameSubmit(feed.subscription_id, title)}
            />
                    {downloadingFeed?.feedId === feed.id && downloadingFeed.total > 0 && (
              <div className="px-2 py-1">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                  <span>Caching...</span>
                  <span>{downloadingFeed.current}/{downloadingFeed.total}</span>
                </div>
                <div className="h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(downloadingFeed.current / downloadingFeed.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create category */}
      {creatingCategory ? (
        <div className="px-2 py-1">
          <input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onBlur={() => {
              if (!newCategoryName.trim()) setCreatingCategory(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateCategory()
              if (e.key === 'Escape') setCreatingCategory(false)
            }}
            placeholder="Category name"
            autoFocus
            className="w-full px-2 py-1 text-sm rounded bg-zinc-200 dark:bg-zinc-700 border border-transparent focus:border-zinc-400 outline-none"
          />
        </div>
      ) : (
        <button
          onClick={() => setCreatingCategory(true)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <Plus size={12} />
          New Category
        </button>
      )}

      {/* Context menu */}
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
