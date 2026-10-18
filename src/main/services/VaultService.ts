import { execSync } from 'child_process'
import { existsSync, statSync } from 'fs'
import { VAULT_MOUNT_PATH } from '../db'

export function isVaultMounted(): boolean {
  if (!existsSync(VAULT_MOUNT_PATH)) return false

  try {
    // Compare device IDs: if /Volumes/SecretLibrary has a different device than /Volumes,
    // it's a real mount point (not just a stale directory on the main drive)
    const volumesDev = statSync('/Volumes').dev
    const targetDev = statSync(VAULT_MOUNT_PATH).dev
    return targetDev !== volumesDev
  } catch {
    return false
  }
}

export function unmountVault(): void {
  try {
    execSync(`diskutil unmount "${VAULT_MOUNT_PATH}"`, { timeout: 10000 })
  } catch {
    try {
      execSync(`diskutil unmountDisk force "${VAULT_MOUNT_PATH}"`, { timeout: 10000 })
    } catch {
      // Best-effort: volume may already be unmounted
    }
  }
}
