import { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { X } from 'lucide-react'
import { ImportExportTab } from './import-export-tab'
import { GeneralTab } from './general-tab'
import { StorageTab } from './storage-tab'
import { AboutTab } from './about-tab'

type Tab = 'general' | 'storage' | 'import-export' | 'about'

export function SettingsDialog() {
  const setShowSettingsDialog = useAppStore((s) => s.setShowSettingsDialog)
  const [tab, setTab] = useState<Tab>('general')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettingsDialog(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setShowSettingsDialog])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            onClick={() => setShowSettingsDialog(false)}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setTab('general')}
            className={`px-4 py-2 text-sm ${
              tab === 'general'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setTab('storage')}
            className={`px-4 py-2 text-sm ${
              tab === 'storage'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Storage
          </button>
          <button
            onClick={() => setTab('import-export')}
            className={`px-4 py-2 text-sm ${
              tab === 'import-export'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Import / Export
          </button>
          <button
            onClick={() => setTab('about')}
            className={`px-4 py-2 text-sm ${
              tab === 'about'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            About
          </button>
        </div>

        <div className="p-4">
          {tab === 'general' && <GeneralTab />}
          {tab === 'storage' && <StorageTab />}
          {tab === 'import-export' && <ImportExportTab />}
          {tab === 'about' && <AboutTab />}
        </div>
      </div>
    </div>
  )
}
