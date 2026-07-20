import { BrowserWindow, app, ipcMain, protocol, net } from 'electron'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
import { registerFileHandlers } from './ipc/file-handlers.js'
import { registerPrefsHandlers } from './ipc/prefs-handlers.js'
import { registerWindowHandlers } from './ipc/window-handlers.js'
import { buildMenu } from './menu.js'
import store from './store.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let mainWindow = null
let pendingOpenFile = null  // file path queued before window is ready

// ── Single instance lock ────────────────────────────────────

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    // A second instance was launched — focus our window and forward the file
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    // The file path is typically the last argument
    const fileArg = findMdArg(commandLine)
    if (fileArg) {
      sendOpenFile(fileArg)
    }
  })
}

function normalizeOpenPath(filePath) {
  // Decode URI-encoded characters and resolve to absolute path
  try { filePath = decodeURIComponent(filePath) } catch { /* not encoded */ }
  return resolve(filePath)
}

function findMdArg(argv) {
  if (!argv) return null
  for (const arg of argv) {
    if (typeof arg !== 'string') continue
    if (!/\.(md|markdown|mdown|mkd|mdx)$/i.test(arg)) continue
    const absolute = normalizeOpenPath(arg)
    if (existsSync(absolute)) return absolute
  }
  return null
}

function sendOpenFile(filePath) {
  if (mainWindow) {
    mainWindow.webContents.send('open-file', normalizeOpenPath(filePath))
  }
}

// macOS: open file from Finder (emitted before ready when app is closed)
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  if (mainWindow) {
    sendOpenFile(filePath)
  } else {
    pendingOpenFile = normalizeOpenPath(filePath)
  }
})

// Register a custom protocol to serve local filesystem files.
// This allows <img src="local-asset:///C:/path/to/image.png"> to work
// in the preview pane regardless of whether we're in dev or production mode.
function registerLocalAssetProtocol() {
  protocol.handle('local-asset', (request) => {
    // URL format:  local-asset:///C:/Users/.../image.png  (Windows)
    //              local-asset:///Users/.../image.png     (macOS/Linux)
    let filePath = decodeURIComponent(request.url.replace(/^local-asset:\/\//, ''))

    // On Windows, the URL triple-slash adds an extra leading slash (e.g. /C:/foo)
    // that pathToFileURL doesn't understand. Strip it.
    if (process.platform === 'win32') {
      filePath = filePath.replace(/^\//, '')
    }

    try {
      return net.fetch(pathToFileURL(filePath).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

function createWindow() {
  const { width, height } = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    title: 'Markdown Editor',
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Allow Web Workers from file:// protocol in production builds.
      // Workers are needed for off-thread Markdown parsing of large files.
      webSecurity: !!process.env.VITE_DEV_SERVER_URL
    }
  })

  // Save window bounds on resize
  mainWindow.on('resize', () => {
    const [w, h] = mainWindow.getSize()
    store.set('windowBounds', { width: w, height: h })
  })

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Set application menu
  buildMenu(mainWindow)

  // Handle file opened via double-click before window was ready
  mainWindow.webContents.on('did-finish-load', () => {
    // Check for pending file from macOS open-file event or second-instance
    if (pendingOpenFile) {
      sendOpenFile(pendingOpenFile)
      pendingOpenFile = null
      return
    }
    // Check for file path passed on first launch (Windows double-click)
    const fileArg = findMdArg(process.argv)
    if (fileArg) {
      sendOpenFile(fileArg)
    }
  })
}

// Register all IPC handlers
function registerIpcHandlers() {
  registerFileHandlers(ipcMain, mainWindow)
  registerPrefsHandlers(ipcMain, store)
  registerWindowHandlers(ipcMain, mainWindow)
}

app.whenReady().then(() => {
  registerLocalAssetProtocol()
  createWindow()
  registerIpcHandlers()

  // Check for updates (production only — skip in dev)
  if (!process.env.VITE_DEV_SERVER_URL) {
    autoUpdater.checkForUpdatesAndNotify()
  }

  // macOS: re-create window when dock icon clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      registerIpcHandlers()
    }
  })
})

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
