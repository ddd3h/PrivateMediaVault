import { create } from 'zustand'
import { invoke } from '../lib/ipc'

type VaultStatus = 'locked' | 'unlocking' | 'unlocked' | 'locking'

interface VaultStore {
  status: VaultStatus
  debugInfo: string
  setStatus: (status: VaultStatus) => void
  unlock: () => Promise<boolean>
  lock: () => Promise<void>
}

export const useVaultStore = create<VaultStore>((set) => ({
  status: 'locked',
  debugInfo: '',

  setStatus: (status) => set({ status }),

  unlock: async () => {
    set({ status: 'unlocking', debugInfo: '' })
    try {
      const res = await invoke<{ mounted: boolean; _debug?: Record<string, unknown> }>('vault:check-mount')
      const debug = res._debug ? JSON.stringify(res._debug) : ''
      if (!res.mounted) {
        set({ status: 'locked', debugInfo: `mount check failed: ${debug}` })
        return false
      }
      const dbRes = await invoke<{ success: boolean; error?: string }>('db:open')
      if (!dbRes.success) {
        set({ status: 'locked', debugInfo: `db:open failed: ${dbRes.error ?? 'unknown'}` })
        return false
      }
      set({ status: 'unlocked', debugInfo: '' })
      return true
    } catch (e) {
      set({ status: 'locked', debugInfo: `exception: ${(e as Error).message}` })
      return false
    }
  },

  lock: async () => {
    set({ status: 'locking' })
    try {
      await invoke('vault:lock')
    } finally {
      set({ status: 'locked' })
    }
  },
}))
