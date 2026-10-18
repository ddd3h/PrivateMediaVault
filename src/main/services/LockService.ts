import { app, BrowserWindow } from 'electron'
import { closeDatabase } from '../db'
import { unmountVault } from './VaultService'

export async function executeLockSequence(win: BrowserWindow): Promise<void> {
  // Step 1: Stop playback
  win.webContents.send('playback:stop')

  // Short wait for renderer to acknowledge stop
  await new Promise(r => setTimeout(r, 200))

  // Step 2: Close DB
  closeDatabase()

  // Step 3: Clear renderer cache
  await win.webContents.session.clearCache()
  await win.webContents.session.clearStorageData({
    storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
  })

  // Step 4: Clear macOS Recent Documents
  app.clearRecentDocuments()

  // Step 5: Unmount encrypted volume
  unmountVault()

  // Step 6: Navigate to unlock screen
  win.webContents.send('vault:locked')
}
