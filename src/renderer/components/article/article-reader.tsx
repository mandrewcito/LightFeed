import { useEffect } from 'react'
import { useArticleStore } from '../../stores/article-store'
import { api } from '../../lib/ipc-client'
import { formatDate, isYouTubeUrl, stripHtml } from '../../lib/utils'
import {
  ExternalLink,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Play
} from 'lucide-react'

function processHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank')
    a.setAttribute('rel', 'noopener noreferrer')
  })
  return doc.body.innerHTML
}

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
          ) : isYouTubeUrl(selectedEntry.url) ? (
            <div className="space-y-4">
              {selectedEntry.thumbnail && (
                <a
                  href={selectedEntry.url!}
                  onClick={(e) => { e.preventDefault(); api.openExternal(selectedEntry.url!) }}
                  className="block"
                >
                  <img
                    src={selectedEntry.thumbnail}
                    alt={selectedEntry.title || ''}
                    className="w-full rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                  />
                </a>
              )}
              {selectedEntry.content && (
                <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {stripHtml(selectedEntry.content)}
                </div>
              )}
              <a
                href={selectedEntry.url!}
                onClick={(e) => { e.preventDefault(); api.openExternal(selectedEntry.url!) }}
                className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
              >
                <Play size={16} fill="currentColor" />
                Watch on YouTube
              </a>
            </div>
          ) : fullContent ? (
            <div
              className="article-content text-sm text-zinc-800 dark:text-zinc-200"
              dangerouslySetInnerHTML={{ __html: processHtml(fullContent) }}
            />
          ) : selectedEntry.content ? (
            <div
              className="article-content text-sm text-zinc-800 dark:text-zinc-200"
              dangerouslySetInnerHTML={{ __html: processHtml(selectedEntry.content) }}
            />
          ) : (
            <p className="text-zinc-400 italic">No content available</p>
          )}
        </article>
      </div>
    </div>
  )
}
