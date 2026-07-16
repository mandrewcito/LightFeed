import { app, shell, BrowserWindow, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase } from './database'
import { FeedService } from './feed-service'
import { registerIpcHandlers } from './ipc'
import { startCleanupScheduler, stopCleanupScheduler } from './cleanup-service'
import { setupAutoUpdater } from './auto-updater'

let mainWindow: BrowserWindow | null = null
let feedService: FeedService | null = null

function createWindow(): void {
  const iconPath = app.isPackaged
    ? join(__dirname, '../../resources/lf-icon.png')
    : join(process.resourcesPath, 'lf-icon.png')

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.commandLine.appendSwitch('no-sandbox')

app.whenReady().then(() => {
  app.name = 'LightFeed'
  electronApp.setAppUserModelId('dev.mandrewcito.lightfeed')

  if (app.isPackaged) {
    Menu.setApplicationMenu(null)
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  initDatabase()
  registerIpcHandlers()

  feedService = new FeedService()
  feedService.startScheduler(30 * 60 * 1000) // 30 minutes

  startCleanupScheduler()

  createWindow()

  if (app.isPackaged) {
    setupAutoUpdater(mainWindow!)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  feedService?.stopScheduler()
  stopCleanupScheduler()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}
