import { useState, useEffect } from 'react'
import { useFeedStore } from '../../stores/feed-store'
import { useAppStore } from '../../stores/app-store'
import { useArticleStore } from '../../stores/article-store'
import { FeedTree } from '../feed/feed-tree'
import { ContextMenu } from '../ui/context-menu'
import {
  Rss,
  Plus,
  Star,
  PanelLeftClose,
  RefreshCw,
  Settings,
  Trash2,
  Download
} from 'lucide-react'

export function Sidebar() {
  const selectAll = useFeedStore((s) => s.selectAll)
  const selectStarred = useFeedStore((s) => s.selectStarred)
  const selectedView = useFeedStore((s) => s.selectedView)
  const refreshAll = useFeedStore((s) => s.refreshAll)
  const unreadCounts = useFeedStore((s) => s.unreadCounts)
  const multiSelectedFeedIds = useFeedStore((s) => s.multiSelectedFeedIds)
  const removeMultipleFeeds = useFeedStore((s) => s.removeMultipleFeeds)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setShowAddFeedDialog = useAppStore((s) => s.setShowAddFeedDialog)
  const setShowSettingsDialog = useAppStore((s) => s.setShowSettingsDialog)
  const showDeleteConfirm = useAppStore((s) => s.showDeleteConfirm)
  const setShowDeleteConfirm = useAppStore((s) => s.setShowDeleteConfirm)
  const [refreshing, setRefreshing] = useState(false)
  const [allCtxMenu, setAllCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const downloading = useArticleStore((s) => s.downloading)
  const downloadAllContent = useArticleStore((s) => s.downloadAllContent)
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null)

  useEffect(() => {
    if (!showDeleteConfirm) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowDeleteConfirm(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showDeleteConfirm, setShowDeleteConfirm])

  const handleDeleteSelected = async () => {
    await removeMultipleFeeds(multiSelectedFeedIds)
    setShowDeleteConfirm(false)
  }

  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + n, 0)

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshAll()
    setRefreshing(false)
  }

  const handleDownloadAll = async () => {
    setDownloadProgress({ current: 0, total: 0 })
    await downloadAllContent((current, total) => {
      setDownloadProgress({ current, total })
    })
    setDownloadProgress(null)
  }

  return (
    <div className="flex flex-col w-[240px] min-w-[240px] h-full bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 drag-region">
        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 no-drag">
          LightFeed
        </span>
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={handleRefresh}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
            title="Refresh all feeds"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowSettingsDialog(true)}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
            title="Collapse sidebar"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="px-2 pb-2 space-y-0.5">
        <button
          onClick={selectAll}
          onContextMenu={(e) => { e.preventDefault(); setAllCtxMenu({ x: e.clientX, y: e.clientY }) }}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
            selectedView === 'all'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/50'
          }`}
        >
          <Rss size={14} />
          <span className="flex-1">All Articles</span>
          {totalUnread > 0 && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{totalUnread}</span>
          )}
        </button>
        {downloading && (
          <div className="px-2 pt-1">
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
              {downloadProgress && downloadProgress.total > 0
                ? `Caching... ${downloadProgress.current}/${downloadProgress.total} articles`
                : 'Preparing...'}
            </div>
            <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: downloadProgress && downloadProgress.total > 0
                  ? `${(downloadProgress.current / downloadProgress.total) * 100}%`
                  : '0%' }}
              />
            </div>
          </div>
        )}
        <button
          onClick={selectStarred}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
            selectedView === 'starred'
              ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700/50'
          }`}
        >
          <Star size={14} />
          <span className="flex-1">Starred</span>
        </button>
      </div>

      {/* Divider */}
      <div className="px-3 pb-1">
        <div className="border-t border-zinc-200 dark:border-zinc-700" />
      </div>

      {/* Feed tree */}
      <div className="flex-1 overflow-y-auto px-2">
        <FeedTree />
      </div>

      {/* Multi-select toolbar */}
      {multiSelectedFeedIds.length >= 2 && (
        <div className="px-2 py-1.5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {multiSelectedFeedIds.length} selected
            </span>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 size={10} />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold">Delete Feeds</h2>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Remove {multiSelectedFeedIds.length} selected feeds?
              </p>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelected}
                className="px-3 py-1.5 text-sm rounded bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add feed button */}
      <div className="px-2 py-2 border-t border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setShowAddFeedDialog(true)}
          className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <Plus size={14} />
          <span>Add Feed</span>
        </button>
      </div>

      {/* All articles context menu */}
      {allCtxMenu && (
        <ContextMenu
          x={allCtxMenu.x}
          y={allCtxMenu.y}
          onClose={() => setAllCtxMenu(null)}
        items={[
          {
            icon: <Download size={14} />,
            label: 'Download all news',
            action: handleDownloadAll,
            disabled: downloading,
          }
        ]}
        />
      )}
    </div>
  )
}
