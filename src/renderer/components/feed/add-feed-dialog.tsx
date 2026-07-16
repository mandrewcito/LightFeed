import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { useFeedStore } from '../../stores/feed-store'
import { X } from 'lucide-react'

export function AddFeedDialog() {
  const setShowAddFeedDialog = useAppStore((s) => s.setShowAddFeedDialog)
  const addFeed = useFeedStore((s) => s.addFeed)
  const categories = useFeedStore((s) => s.categories)
  const [url, setUrl] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAddFeedDialog(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setShowAddFeedDialog])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    setLoading(true)
    setError('')
    try {
      await addFeed(url.trim(), categoryId || undefined)
      setShowAddFeedDialog(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">Add Feed</h2>
          <button
            onClick={() => setShowAddFeedDialog(false)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              Feed URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              autoFocus
              className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              Category (optional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 outline-none focus:border-blue-500"
            >
              <option value="">No category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddFeedDialog(false)}
              className="px-3 py-1.5 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Feed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
