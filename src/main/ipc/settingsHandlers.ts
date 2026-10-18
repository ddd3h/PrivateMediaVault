import { ipcMain } from 'electron'
import { getSetting, setSetting } from '../services/SettingsService'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (_event, { key }: { key: string }) => {
    return { value: getSetting(key) }
  })

  ipcMain.handle('settings:set', (_event, { key, value }: { key: string; value: unknown }) => {
    setSetting(key, value as Parameters<typeof setSetting>[1])
    return { success: true }
  })
}
