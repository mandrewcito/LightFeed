import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/ipc-client'
import { useFeedStore } from '../../stores/feed-store'
import { Download, Upload, Info } from 'lucide-react'

function ExportSection({ exporting, handleExport, exportMsg, exportErr }) {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Export</h3>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
        Export your subscriptions as an OPML file.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export OPML'}
        </button>
        {exportMsg && (
          <span
            className={`text-xs ${exportErr ? 'text-red-500' : 'text-green-600'}`}
          >
            {exportMsg}
          </span>
        )}
      </div>
    </div>
  )
}

export function ImportExportTab() {
  const loadFeeds = useFeedStore((s) => s.loadFeeds)
  const loadUnreadCounts = useFeedStore((s) => s.loadUnreadCounts)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState('')
  const [exportErr, setExportErr] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [importErr, setImportErr] = useState(false)
  const [totalFeeds, setTotalFeeds] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const exportTimer = useRef<ReturnType<typeof setTimeout>>()
  const importTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    return () => {
      clearTimeout(exportTimer.current)
      clearTimeout(importTimer.current)
    }
  }, [])

  useEffect(() => {
    api.onImportProgress((data) => {
      setTotalFeeds(data.total)
      setImportedCount(data.imported)
      setErrorCount(data.errors)
      loadFeeds()
      loadUnreadCounts()
    })
  }, [])

  const showExport = (msg: string, err: boolean) => {
    setExportMsg(msg)
    setExportErr(err)
    clearTimeout(exportTimer.current)
    exportTimer.current = setTimeout(() => setExportMsg(''), 5000)
  }

  const showImport = (msg: string, err: boolean) => {
    setImportMsg(msg)
    setImportErr(err)
    clearTimeout(importTimer.current)
    importTimer.current = setTimeout(() => setImportMsg(''), 5000)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const opml = await api.exportOPML()
      const count = (opml.match(/xmlUrl=/g) || []).length
      const blob = new Blob([opml], { type: 'text/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'lightfeed-subscriptions.opml'
      a.click()
      URL.revokeObjectURL(url)
      showExport(`Exported ${count} subscription${count !== 1 ? 's' : ''}`, false)
    } catch (err) {
      showExport(`Export failed: ${String(err)}`, true)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.opml,.xml'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setImporting(true)
      setTotalFeeds(0)
      setImportedCount(0)
      setErrorCount(0)

      try {
        const content = await file.text()
        const result = await api.importOPML(content)

        await loadFeeds()
        await loadUnreadCounts()

        let msg = `Imported ${result.imported} feed${result.imported !== 1 ? 's' : ''}`
        if (result.errors.length > 0) {
          msg += ` (${result.errors.length} error${result.errors.length !== 1 ? 's' : ''})`
          const lines = result.errors.slice(0, 3).map((e) => e.split(':')[0]).join('\n')
          msg += `\n${lines}`
          if (result.errors.length > 3) {
            msg += `\n...and ${result.errors.length - 3} more`
          }
        }
        showImport(msg, result.errors.length > 0)
      } catch (err) {
        showImport(`Import failed: ${String(err)}`, true)
      } finally {
        setImporting(false)
        input.value = ''
      }
    }
    input.click()
  }

  const progressPercent = totalFeeds > 0 ? Math.round((importedCount / totalFeeds) * 100) : 0

  return (
    <div className="space-y-6">
      <ExportSection
        exporting={exporting}
        handleExport={handleExport}
        exportMsg={exportMsg}
        exportErr={exportErr}
      />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-medium">Import</h3>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title="What is OPML?"
          >
            <Info size={14} className="text-zinc-400" />
          </button>
        </div>

        {showHelp && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded border border-zinc-200 dark:border-zinc-700">
            OPML (Outline Processor Markup Language) is an XML format used to
            store lists of feed subscriptions. It lets you move your feeds
            between different RSS readers.
          </div>
        )}

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
          Upload an OPML file to import subscriptions.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleImport}
            disabled={importing}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <Upload size={14} />
            {importing ? 'Importing...' : 'Import OPML'}
          </button>
          {importMsg && !importing && (
            <span
              className={`text-xs ${importErr ? 'text-red-500' : 'text-green-600'}`}
              style={{ whiteSpace: 'pre-line' }}
            >
              {importMsg}
            </span>
          )}
        </div>

        {importing && totalFeeds > 0 && (
          <div className="mt-3 space-y-1">
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {importedCount} / {totalFeeds} feeds
              {errorCount > 0 && ` (${errorCount} errors)`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
