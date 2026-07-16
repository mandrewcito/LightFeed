import { useEffect, useState } from 'react'
import { api } from '../../lib/ipc-client'
import { ConfirmDialog } from '../ui/confirm-dialog'

export function StorageTab() {
  const [currentPath, setCurrentPath] = useState('')
  const [moving, setMoving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; message: string; actions: Array<{ label: string; value: string; variant?: 'primary' | 'danger' | 'default' }>; onAction: (v: string) => void } | null>(null)
  const [cleanupEnabled, setCleanupEnabled] = useState(false)
  const [cleanupDays, setCleanupDays] = useState(30)
  const [cleaning, setCleaning] = useState(false)
  const [cleanupResult, setCleanupResult] = useState('')

  useEffect(() => {
    api.getCurrentDbPath().then(setCurrentPath).catch(() => {})
    api.getSetting('cleanup_older_than_days').then((val) => {
      if (val) {
        const n = parseInt(val, 10)
        if (!isNaN(n) && n > 0) {
          setCleanupEnabled(true)
          setCleanupDays(n)
        }
      }
    }).catch(() => {})
  }, [])

  const showDialog = (title: string, message: string, actions: Array<{ label: string; value: string; variant?: 'primary' | 'danger' | 'default' }>, onAction: (v: string) => void) => {
    setDialog({ title, message, actions, onAction })
    setDialogOpen(true)
  }

  const handleMove = async () => {
    const folder = await api.selectFolder()
    if (!folder) return

    const { exists } = await api.checkDbExists(folder)

    if (exists) {
      showDialog(
        'Existing Database Found',
        'A database already exists at this location.\n\nUse existing data or replace it?',
        [
          { label: 'Use Existing', value: 'use-existing', variant: 'primary' },
          { label: 'Replace', value: 'replace', variant: 'danger' },
          { label: 'Cancel', value: 'cancel' }
        ],
        (action) => {
          if (action === 'cancel') return
          setMoving(true)
          api.moveDb(folder, action as 'replace' | 'use-existing')
        }
      )
      return
    }

    showDialog(
      'Move Database',
      'Move database to the selected folder?\n\nThe database will be copied and the app will restart.',
      [
        { label: 'Move', value: 'move', variant: 'primary' },
        { label: 'Cancel', value: 'cancel' }
      ],
      (action) => {
        if (action === 'cancel') return
        setMoving(true)
        api.moveDb(folder, 'replace')
      }
    )
  }

  const handleCleanupToggle = async (checked: boolean) => {
    setCleanupEnabled(checked)
    if (checked) {
      await api.setSetting('cleanup_older_than_days', String(cleanupDays))
    } else {
      await api.setSetting('cleanup_older_than_days', '')
    }
  }

  const handleCleanupDays = async (days: number) => {
    setCleanupDays(days)
    if (cleanupEnabled && days > 0) {
      await api.setSetting('cleanup_older_than_days', String(days))
    }
  }

  const handleRunNow = async () => {
    setCleaning(true)
    setCleanupResult('')
    try {
      const deleted = await api.runCleanupNow()
      setCleanupResult(`Deleted ${deleted} entries.`)
    } catch {
      setCleanupResult('Cleanup failed.')
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">Storage Location</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 truncate" title={currentPath}>
          {currentPath || 'Loading...'}
        </p>
        <button
          onClick={handleMove}
          disabled={moving}
          className="px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {moving ? 'Moving...' : 'Move to...'}
        </button>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
        <h3 className="text-sm font-medium mb-2">Sync Across Devices</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          LightFeed stores all data in a single DB file. To sync across machines,
          use "Move to..." to point it at a folder synced by your cloud provider
          (ownCloud, Nextcloud, Dropbox, etc). Share the same folder across devices
          and each instance will use the same DB.
        </p>
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-700 pt-4">
        <h3 className="text-sm font-medium mb-2">Data Cleanup</h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Automatically remove old entries to save disk space.
        </p>

        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={cleanupEnabled}
            onChange={(e) => handleCleanupToggle(e.target.checked)}
            className="rounded border-zinc-300 dark:border-zinc-600"
          />
          <span className="text-sm">Remove entries older than</span>
          <input
            type="number"
            min={1}
            value={cleanupDays}
            onChange={(e) => handleCleanupDays(parseInt(e.target.value, 10) || 1)}
            disabled={!cleanupEnabled}
            className="w-16 px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 outline-none disabled:opacity-50"
          />
          <span className="text-sm">days</span>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunNow}
            disabled={cleaning || !cleanupEnabled}
            className="px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {cleaning ? 'Cleaning...' : 'Run Now'}
          </button>
          {cleanupResult && (
            <span className="text-xs text-zinc-500">{cleanupResult}</span>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title={dialog?.title || ''}
        message={dialog?.message || ''}
        actions={dialog?.actions || []}
        onAction={(v) => {
          dialog?.onAction(v)
        }}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
