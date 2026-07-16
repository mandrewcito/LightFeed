import { useEffect } from 'react'
import { useArticleStore } from '../../stores/article-store'
import { api } from '../../lib/ipc-client'
import { formatDate } from '../../lib/utils'
import {
  ExternalLink,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react'

export function ArticleReader() {
  const selectedEntry = useArticleStore((s) => s.selectedEntry)
  const fullContent = useArticleStore((s) => s.fullContent)
  const loadingContent = useArticleStore((s) => s.loadingContent)
  const toggleStar = useArticleStore((s) => s.toggleStar)
  const clearSelection = useArticleStore((s) => s.clearSelection)
  const navigateNext = useArticleStore((s) => s.navigateNext)
  const navigatePrev = useArticleStore((s) => s.navigatePrev)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Escape') clearSelection()
      if (e.key === 'ArrowLeft') navigatePrev()
      if (e.key === 'ArrowRight') navigateNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (!selectedEntry) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 dark:text-zinc-500 text-sm">
        Select an article to read
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <button
          onClick={clearSelection}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
        >
          <X size={16} />
        </button>
        <button
          onClick={navigatePrev}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
          title="Previous article (←)"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={navigateNext}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
          title="Next article (→)"
        >
          <ChevronRight size={16} />
        </button>

        <div className="flex-1" />

        <button
          onClick={() => toggleStar(selectedEntry.id)}
          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Toggle star (s)"
        >
          <Star
            size={16}
            className={selectedEntry.starred ? 'text-yellow-500 fill-yellow-500' : 'text-zinc-400'}
          />
        </button>

        {selectedEntry.url && (
          <button
            onClick={() => api.openExternal(selectedEntry.url!)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            title="Open in browser"
          >
            <ExternalLink size={16} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-8 py-6">
          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-3">
            {selectedEntry.feed_image_url && (
              <img src={selectedEntry.feed_image_url} alt="" className="w-4 h-4 rounded-sm" />
            )}
            <span>{selectedEntry.feed_title}</span>
            {selectedEntry.author && (
              <>
                <span>·</span>
                <span>{selectedEntry.author}</span>
              </>
            )}
            <span>·</span>
            <span>{formatDate(selectedEntry.published_at)}</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-4 leading-tight">
            {selectedEntry.title || 'Untitled'}
          </h1>

          {/* Content */}
          {loadingContent ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-zinc-400" />
            </div>
          ) : fullContent ? (
            <div
              className="article-content text-sm text-zinc-800 dark:text-zinc-200"
              dangerouslySetInnerHTML={{ __html: fullContent }}
            />
          ) : selectedEntry.content ? (
            <div
              className="article-content text-sm text-zinc-800 dark:text-zinc-200"
              dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
            />
          ) : (
            <p className="text-zinc-400 italic">No content available</p>
          )}
        </article>
      </div>
    </div>
  )
}
