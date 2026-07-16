import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('update:notAvailable')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:downloadProgress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded')
  })

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater]', err.message)
    mainWindow.webContents.send('update:error', err.message)
  })

  autoUpdater.checkForUpdates()
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate()
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
