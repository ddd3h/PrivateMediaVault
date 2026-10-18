import { app, BrowserWindow, shell, protocol, net } from 'electron'
import { join } from 'path'
import { registerAllHandlers } from './ipc'
import { getSetting, setSetting } from './services/SettingsService'

const isDev = process.env.NODE_ENV === 'development'

// Prevent GPU process crashes on Apple Silicon with certain video codecs
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')

// Register vault:// for production (file:// works in prod since renderer loads from file://)
protocol.registerSchemesAsPrivileged([{
  scheme: 'vault',
  privileges: {
    secure: true,
    standard: true,
    stream: true,
    supportFetchAPI: true,
    corsEnabled: false,
  },
}])

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const savedBounds = getSetting('windowBounds') as { x: number; y: number; width: number; height: number } | null

  mainWindow = new BrowserWindow({
    x: savedBounds?.x,
    y: savedBounds?.y,
    width: savedBounds?.width ?? 1280,
    height: savedBounds?.height ?? 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,        // sandbox:true blocks file:// even with webSecurity:false
      webSecurity: false,    // allow file:// media from /Volumes/SecretLibrary; safe: no external content loaded
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      spellcheck: false,
    },
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('file://') || url.startsWith('vault://') || (isDev && url.startsWith('http://localhost'))
    if (!allowed) event.preventDefault()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds()
      setSetting('windowBounds', bounds)
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../../dist/renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // vault:// for production: maps vault:///abs/path → file:///abs/path
  // restricted to /Volumes/SecretLibrary only
  protocol.handle('vault', (request) => {
    const url = new URL(request.url)
    const filePath = url.pathname
    if (!filePath.startsWith('/Volumes/SecretLibrary/')) {
      return new Response('Forbidden', { status: 403 })
    }
    return net.fetch(`file://${filePath}`)
  })

  registerAllHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('browser-window-focus', () => {
  app.clearRecentDocuments()
})
