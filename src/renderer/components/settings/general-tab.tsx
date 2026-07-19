import { useAppStore } from '../../stores/app-store'

export function GeneralTab() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Theme</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="w-full px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Keyboard Shortcuts</h3>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
          <div className="flex justify-between"><span>Navigate down</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">j</kbd></div>
          <div className="flex justify-between"><span>Navigate up</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">k</kbd></div>
          <div className="flex justify-between"><span>Toggle star</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">s</kbd></div>
          <div className="flex justify-between"><span>Mark as read</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">m</kbd></div>
          <div className="flex justify-between"><span>Refresh</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">r</kbd></div>
          <div className="flex justify-between"><span>Add feed</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">a</kbd></div>
          <div className="flex justify-between"><span>Search</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">/</kbd></div>
          <div className="flex justify-between"><span>Toggle sidebar</span><kbd className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded">b</kbd></div>
        </div>
      </div>
    </div>
  )
}
