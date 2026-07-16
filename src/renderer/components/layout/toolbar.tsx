import { useFeedStore } from '../../stores/feed-store'
import { useArticleStore } from '../../stores/article-store'
import { useAppStore } from '../../stores/app-store'
import { api } from '../../lib/ipc-client'
import {
  Search,
  LayoutGrid,
  List,
  AlignLeft,
  PanelLeft,
  CheckCheck,
  Loader2
} from 'lucide-react'

export function Toolbar() {
  const selectedView = useFeedStore((s) => s.selectedView)
  const selectedFeedId = useFeedStore((s) => s.selectedFeedId)
  const selectedCategoryId = useFeedStore((s) => s.selectedCategoryId)
  const markAllRead = useArticleStore((s) => s.markAllRead)
  const viewMode = useAppStore((s) => s.viewMode)
  const setViewMode = useAppStore((s) => s.setViewMode)
  const searchQuery = useAppStore((s) => s.searchQuery)
  const setSearchQuery = useAppStore((s) => s.setSearchQuery)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const loadEntries = useArticleStore((s) => s.loadEntries)
  const loading = useArticleStore((s) => s.loading)

  const handleMarkAllRead = async () => {
    if (selectedView === 'feed' && selectedFeedId) {
      await markAllRead(selectedFeedId)
    } else if (selectedView === 'category' && selectedCategoryId) {
      await markAllRead(undefined, selectedCategoryId)
    } else {
      await markAllRead()
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    loadEntries()
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        >
          <PanelLeft size={16} />
        </button>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 relative">
        {loading && searchQuery ? (
          <Loader2 size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 animate-spin" />
        ) : (
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
        )}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-7 pr-2 py-1 text-sm rounded bg-zinc-100 dark:bg-zinc-800 border border-transparent focus:border-zinc-300 dark:focus:border-zinc-600 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
        />
      </form>

      {/* Mark all read */}
      <button
        onClick={handleMarkAllRead}
        className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
        title="Mark all as read"
      >
        <CheckCheck size={16} />
      </button>

      {/* View modes */}
      <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 rounded p-0.5">
        <button
          onClick={() => setViewMode('cards')}
          className={`p-1 rounded ${
            viewMode === 'cards'
              ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
          title="Card view"
        >
          <LayoutGrid size={14} />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-1 rounded ${
            viewMode === 'list'
              ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
          title="List view"
        >
          <List size={14} />
        </button>
        <button
          onClick={() => setViewMode('compact')}
          className={`p-1 rounded ${
            viewMode === 'compact'
              ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
          title="Compact view"
        >
          <AlignLeft size={14} />
        </button>
      </div>
    </div>
  )
}
