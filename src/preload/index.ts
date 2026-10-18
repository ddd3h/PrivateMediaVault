import { contextBridge, ipcRenderer, webUtils } from 'electron'

const allowedChannels = [
  'vault:check-mount',
  'vault:lock',
  'vault:mount-image',
  'db:open',
  'db:close',
  'media:import-files',
  'media:import-folder',
  'media:get',
  'media:list',
  'media:update',
  'media:delete',
  'media:get-thumbnail-path',
  'media:update-tags',
  'media:set-thumbnail',
  'search:query',
  'category:list',
  'category:create',
  'category:update',
  'category:delete',
  'tag:list',
  'tag:delete',
  'settings:get',
  'settings:set',
] as const

const allowedEvents = [
  'playback:stop',
  'vault:locked',
  'media:import-progress',
] as const

type AllowedChannel = typeof allowedChannels[number]
type AllowedEvent = typeof allowedEvents[number]

contextBridge.exposeInMainWorld('vault', {
  invoke: <T>(channel: AllowedChannel, params?: unknown): Promise<T> => {
    if (!allowedChannels.includes(channel)) {
      throw new Error(`Channel not allowed: ${channel}`)
    }
    return ipcRenderer.invoke(channel, params)
  },

  on: (channel: AllowedEvent, listener: (...args: unknown[]) => void): (() => void) => {
    if (!allowedEvents.includes(channel)) {
      throw new Error(`Event not allowed: ${channel}`)
    }
    const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },

  getPathForFile: (file: File): string => {
    return webUtils.getPathForFile(file)
  },
})
