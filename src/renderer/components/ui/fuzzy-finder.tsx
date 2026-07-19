import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Rss, FileText } from 'lucide-react'
import { useAppStore } from '../../stores/app-store'
import { useFeedStore } from '../../stores/feed-store'
import { useArticleStore } from '../../stores/article-store'
import { api } from '../../lib/ipc-client'
import type { FeedWithCategory, EntryWithFeed } from '../../types'

interface SearchResult {
  type: 'feed' | 'entry'
  id: string
  title: string
  subtitle: string
  feedId?: string
}

function fuzzyMatch(query: string, text: string): boolean {
  const lower = text.toLowerCase()
  const q = query.toLowerCase()
  return lower.includes(q)
}

function filterFeeds(query: string, feeds: FeedWithCategory[]): SearchResult[] {
  if (!query) return []
  return feeds
    .filter((f) => {
      const title = f.custom_title || f.title || ''
      return fuzzyMatch(query, title) || fuzzyMatch(query, f.url)
    })
    .slice(0, 10)
    .map((f) => ({
      type: 'feed' as const,
      id: f.feed_id,
      title: f.custom_title || f.title || f.url,
      subtitle: f.url,
      feedId: f.feed_id
    }))
}

export function FuzzyFinder() {
  const { showFuzzyFinder, setShowFuzzyFinder } = useAppStore()
  const { feeds, selectFeed, selectedFeedId } = useFeedStore()
  const { selectEntry } = useArticleStore()

  const [query, setQuery] = useState('')
  const [feedResults, setFeedResults] = useState<SearchResult[]>([])
  const [entryResults, setEntryResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loadingEntries, setLoadingEntries] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const allResults = [...feedResults, ...entryResults]

  // Focus input on open
  useEffect(() => {
    if (showFuzzyFinder) {
      setQuery('')
      setFeedResults([])
      setEntryResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [showFuzzyFinder])

  // Filter feeds in-memory
  useEffect(() => {
    if (!showFuzzyFinder) return
    setFeedResults(filterFeeds(query, feeds))
    setSelectedIndex(0)
  }, [query, feeds, showFuzzyFinder])

  // Fetch entries via API with debounce
  useEffect(() => {
    if (!showFuzzyFinder || !query) {
      setEntryResults([])
      return
    }

    setLoadingEntries(true)
    const timeout = setTimeout(async () => {
      try {
        const results = await api.getEntries({ search: query, limit: 10 })
        const entries: SearchResult[] = results.map((e: EntryWithFeed) => ({
          type: 'entry' as const,
          id: e.id,
          title: e.title || 'Untitled',
          subtitle: e.feed_title || '',
          feedId: e.feed_id
        }))
        setEntryResults(entries)
      } catch {
        setEntryResults([])
      } finally {
        setLoadingEntries(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, showFuzzyFinder])

  const selectResult = useCallback(
    async (result: SearchResult) => {
      if (result.type === 'feed') {
        selectFeed(result.id)
      } else {
        selectFeed(result.feedId!)
        await useArticleStore.getState().loadEntries(true)
        await selectEntry(result.id)
      }
      setShowFuzzyFinder(false)
    },
    [selectFeed, selectEntry, setShowFuzzyFinder]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowFuzzyFinder(false)
        return
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1))
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        return
      }

      if (e.key === 'Enter' && allResults.length > 0) {
        e.preventDefault()
        selectResult(allResults[selectedIndex])
        return
      }
    },
    [allResults, selectedIndex, selectResult, setShowFuzzyFinder]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!showFuzzyFinder) return null

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowFuzzyFinder(false)
      }}
    >
      <div
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
          <Search size={16} className="text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search feeds and articles..."
            className="w-full bg-transparent text-sm outline-none placeholder-zinc-400"
          />
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {!query && (
            <div className="p-4 text-center text-sm text-zinc-400">
              Type to search feeds and articles
            </div>
          )}

          {query && allResults.length === 0 && !loadingEntries && (
            <div className="p-4 text-center text-sm text-zinc-400">No results found</div>
          )}

          {feedResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Feeds
              </div>
              {feedResults.map((result, i) => (
                <button
                  key={result.id}
                  data-selected={i === selectedIndex}
                  onClick={() => selectResult(result)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === selectedIndex
                      ? 'bg-zinc-200 dark:bg-zinc-700'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Rss size={14} className="text-zinc-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    <div className="text-xs text-zinc-400 truncate">{result.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {entryResults.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-wide">
                Articles
              </div>
              {entryResults.map((result, i) => {
                const globalIndex = feedResults.length + i
                return (
                  <button
                    key={result.id}
                    data-selected={globalIndex === selectedIndex}
                    onClick={() => selectResult(result)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      globalIndex === selectedIndex
                        ? 'bg-zinc-200 dark:bg-zinc-700'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <FileText size={14} className="text-zinc-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{result.title}</div>
                      <div className="text-xs text-zinc-400 truncate">{result.subtitle}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {loadingEntries && query && (
            <div className="px-3 py-2 text-xs text-zinc-400 text-center">Searching articles...</div>
          )}
        </div>

        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-zinc-200 dark:border-zinc-700 text-xs text-zinc-400">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}
