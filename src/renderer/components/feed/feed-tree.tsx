import { useState } from 'react'
import { useFeedStore } from '../../stores/feed-store'
import { FeedItem } from './feed-item'
import { ChevronRight, ChevronDown, FolderOpen, Folder, Plus, Trash2, Pencil } from 'lucide-react'

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

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [creatingCategory, setCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null)
  const [dragOverUncategorized, setDragOverUncategorized] = useState(false)

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      const id = await createCategory(newCategoryName.trim())
      setExpandedCategories((prev) => new Set([...prev, id]))
      setNewCategoryName('')
      setCreatingCategory(false)
    }
  }

  const handleRenameCategory = async (id: string) => {
    if (editCategoryName.trim()) {
      await renameCategory(id, editCategoryName.trim())
      setEditingCategory(null)
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

  const uncategorizedFeeds = feeds.filter((f) => !f.category_id)

  return (
    <div className="space-y-0.5">
      {/* Categories */}
      {categories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.id)
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
                {editingCategory === cat.id ? (
                  <input
                    value={editCategoryName}
                    onChange={(e) => setEditCategoryName(e.target.value)}
                    onBlur={() => handleRenameCategory(cat.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCategory(cat.id)
                      if (e.key === 'Escape') setEditingCategory(null)
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
                    setEditingCategory(cat.id)
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
                  <FeedItem
                    key={feed.id}
                    feed={feed}
                    unreadCount={unreadCounts[feed.id] || 0}
                    isSelected={selectedFeedId === feed.id}
                    isMultiSelected={multiSelectedFeedIds.includes(feed.id)}
                    onSelect={() => selectFeed(feed.id)}
                    onMultiSelect={() => toggleSelectFeed(feed.id)}
                    onRemove={() => removeFeed(feed.id)}
                  />
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
          <FeedItem
            key={feed.id}
            feed={feed}
            unreadCount={unreadCounts[feed.id] || 0}
            isSelected={selectedFeedId === feed.id}
            isMultiSelected={multiSelectedFeedIds.includes(feed.id)}
            onSelect={() => selectFeed(feed.id)}
            onMultiSelect={() => toggleSelectFeed(feed.id)}
            onRemove={() => removeFeed(feed.id)}
          />
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


    </div>
  )
}
