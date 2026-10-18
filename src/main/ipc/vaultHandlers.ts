import { ipcMain, BrowserWindow, dialog } from 'electron'
import { existsSync, statSync } from 'fs'
import { execFile } from 'child_process'
import { isVaultMounted } from '../services/VaultService'
import { executeLockSequence } from '../services/LockService'
import { openDatabase, closeDatabase } from '../db'

export function registerVaultHandlers(): void {
  ipcMain.handle('vault:check-mount', () => {
    const path = '/Volumes/SecretLibrary'
    const exists = existsSync(path)
    let devMatch = false
    let vDev = -1
    let tDev = -1
    if (exists) {
      vDev = statSync('/Volumes').dev
      tDev = statSync(path).dev
      devMatch = tDev !== vDev
    }
    const mounted = isVaultMounted()
    process.stdout.write(`[vault] exists=${exists} /Volumes.dev=${vDev} target.dev=${tDev} devMatch=${devMatch} mounted=${mounted}\n`)
    return { mounted, _debug: { exists, vDev, tDev, devMatch } }
  })

  ipcMain.handle('vault:lock', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false }
    await executeLockSequence(win)
    return { success: true }
  })

  ipcMain.handle('vault:mount-image', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { success: false, error: 'No window' }

    // If already mounted, no action needed
    if (isVaultMounted()) return { success: true, alreadyMounted: true }

    // Open file picker for disk image
    const result = await dialog.showOpenDialog(win, {
      title: 'ディスクイメージを選択',
      properties: ['openFile'],
      filters: [
        { name: 'Disk Images', extensions: ['dmg', 'sparseimage', 'sparsebundle', 'img'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    })

    if (result.canceled || !result.filePaths.length) {
      return { success: false, error: 'canceled' }
    }

    const imagePath = result.filePaths[0]

    // Use 'open' to trigger macOS's built-in password dialog + mount
    return new Promise((resolve) => {
      execFile('open', [imagePath], { timeout: 5000 }, (err) => {
        if (err) {
          resolve({ success: false, error: err.message })
        } else {
          // 'open' returns immediately; macOS handles mounting asynchronously
          resolve({ success: true, opened: true })
        }
      })
    })
  })

  ipcMain.handle('db:open', () => {
    try {
      openDatabase()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('db:close', () => {
    try {
      closeDatabase()
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
