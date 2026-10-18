import { registerVaultHandlers } from './vaultHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerMediaHandlers } from './mediaHandlers'
import { registerSearchHandlers } from './searchHandlers'

export function registerAllHandlers(): void {
  registerVaultHandlers()
  registerSettingsHandlers()
  registerMediaHandlers()
  registerSearchHandlers()
}
