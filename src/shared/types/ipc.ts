import type { MediaItem, Category, Tag, ImportOptions, SearchResult } from './media'

export interface IpcChannels {
  // Vault
  'vault:check-mount': { params: void; result: { mounted: boolean } }
  'vault:lock': { params: void; result: { success: boolean } }

  // DB
  'db:open': { params: { vaultPath: string }; result: { success: boolean } }
  'db:close': { params: void; result: { success: boolean } }

  // Media
  'media:import-files': { params: { paths: string[]; options?: ImportOptions }; result: { imported: number; failed: string[] } }
  'media:import-folder': { params: { folderPath: string; options?: ImportOptions }; result: { imported: number; failed: string[] } }
  'media:get': { params: { id: string }; result: MediaItem | null }
  'media:list': { params: { page: number; pageSize: number; categoryId?: string }; result: SearchResult }
  'media:update': { params: { id: string; updates: Partial<MediaItem> }; result: { success: boolean } }
  'media:delete': { params: { ids: string[] }; result: { success: boolean } }
  'media:get-thumbnail-path': { params: { id: string }; result: { path: string | null } }

  // Search
  'search:query': { params: { query: string; page: number; pageSize: number }; result: SearchResult }

  // Categories
  'category:list': { params: void; result: Category[] }
  'category:create': { params: { name: string; parentId?: string }; result: Category }
  'category:update': { params: { id: string; name: string }; result: { success: boolean } }
  'category:delete': { params: { id: string }; result: { success: boolean } }

  // Tags
  'tag:list': { params: void; result: Tag[] }
  'tag:delete': { params: { id: string }; result: { success: boolean } }

  // Settings (internal SSD only — non-sensitive)
  'settings:get': { params: { key: string }; result: { value: unknown } }
  'settings:set': { params: { key: string; value: unknown }; result: { success: boolean } }
}

export type IpcChannel = keyof IpcChannels
