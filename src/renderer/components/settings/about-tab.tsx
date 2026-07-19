import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/ipc-client'

type UpdateStatus =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'notAvailable' }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded' }
  | { type: 'error'; message: string }

export function AboutTab() {
  const [version, setVersion] = useState<string>('')
  const [status, setStatus] = useState<UpdateStatus>({ type: 'idle' })

  useEffect(() => {
    api.getVersion().then(setVersion)
  }, [])

  useEffect(() => {
    api.onUpdateAvailable((info) => setStatus({ type: 'available', version: info.version }))
    api.onUpdateNotAvailable(() => setStatus({ type: 'notAvailable' }))
    api.onUpdateDownloadProgress((progress) =>
      setStatus({ type: 'downloading', percent: Math.round(progress.percent) })
    )
    api.onUpdateDownloaded(() => setStatus({ type: 'downloaded' }))
    api.onUpdateError((message) => setStatus({ type: 'error', message }))
  }, [])

  const handleCheck = useCallback(() => {
    setStatus({ type: 'checking' })
    api.checkForUpdates()
  }, [])

  const handleDownload = useCallback(() => {
    api.downloadUpdate()
  }, [])

  const handleInstall = useCallback(() => {
    api.installUpdate()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">Version:</span>
        <span className="font-mono">{version || '...'}</span>
      </div>

      {status.type === 'idle' && (
        <button
          onClick={handleCheck}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Check for Updates
        </button>
      )}

      {status.type === 'checking' && (
        <p className="text-sm text-zinc-500">Checking for updates...</p>
      )}

      {status.type === 'available' && (
        <div className="space-y-2">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Update v{status.version} available
          </p>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download Update
          </button>
        </div>
      )}

      {status.type === 'notAvailable' && (
        <p className="text-sm text-green-600 dark:text-green-400">Up to date</p>
      )}

      {status.type === 'downloading' && (
        <div className="space-y-1">
          <p className="text-sm text-zinc-500">Downloading... {status.percent}%</p>
          <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${status.percent}%` }}
            />
          </div>
        </div>
      )}

      {status.type === 'downloaded' && (
        <div className="space-y-2">
          <p className="text-sm text-green-600 dark:text-green-400">Update downloaded</p>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Restart &amp; Install
          </button>
        </div>
      )}

      {status.type === 'error' && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400">Error: {status.message}</p>
          <button
            onClick={handleCheck}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
