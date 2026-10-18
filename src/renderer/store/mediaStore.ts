import { create } from 'zustand'
import type { MediaItem, Category, Tag, SearchResult } from '@shared/types'
import { invoke } from '../lib/ipc'

interface MediaStore {
  items: MediaItem[]
  categories: Category[]
  tags: Tag[]
  selectedIds: Set<string>
  currentPage: number
  totalItems: number
  pageSize: number
  isLoading: boolean
  error: string | null
  activeQuery: string | null
  activeCategoryId: string | undefined

  fetchMedia: (page?: number, categoryId?: string) => Promise<void>
  fetchCategories: () => Promise<void>
  fetchTags: () => Promise<void>
  search: (query: string, page?: number) => Promise<void>
  toggleSelect: (id: string) => void
  selectAll: () => void
  clearSelection: () => void
  deleteSelected: () => Promise<void>
  updateItem: (id: string, updates: Partial<MediaItem>) => Promise<void>
  createCategory: (name: string, parentId?: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export const useMediaStore = create<MediaStore>((set, get) => ({
  items: [],
  categories: [],
  tags: [],
  selectedIds: new Set(),
  currentPage: 1,
  totalItems: 0,
  pageSize: 50,
  isLoading: false,
  error: null,
  activeQuery: null,
  activeCategoryId: undefined,

  fetchMedia: async (page = 1, categoryId?: string) => {
    const { isLoading, items } = get()
    if (isLoading) return
    set({ isLoading: true, error: null, activeQuery: null, activeCategoryId: categoryId })
    try {
      const result = await invoke<SearchResult>('media:list', {
        page,
        pageSize: get().pageSize,
        categoryId,
      })
      // Append on next pages, replace on page 1
      set({
        items: page === 1 ? result.items : [...items, ...result.items],
        totalItems: result.total,
        currentPage: page,
        isLoading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  fetchCategories: async () => {
    const categories = await invoke<Category[]>('category:list')
    set({ categories })
  },

  fetchTags: async () => {
    const tags = await invoke<Tag[]>('tag:list')
    set({ tags })
  },

  search: async (query: string, page = 1) => {
    const { isLoading, items } = get()
    if (isLoading) return
    set({ isLoading: true, error: null, activeQuery: query })
    try {
      const result = await invoke<SearchResult>('search:query', {
        query,
        page,
        pageSize: get().pageSize,
      })
      set({
        items: page === 1 ? result.items : [...items, ...result.items],
        totalItems: result.total,
        currentPage: page,
        isLoading: false,
      })
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false })
    }
  },

  toggleSelect: (id) => {
    const selected = new Set(get().selectedIds)
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
    set({ selectedIds: selected })
  },

  selectAll: () => {
    set({ selectedIds: new Set(get().items.map(i => i.id)) })
  },

  clearSelection: () => {
    set({ selectedIds: new Set() })
  },

  deleteSelected: async () => {
    const ids = [...get().selectedIds]
    if (!ids.length) return
    await invoke('media:delete', { ids })
    set({ selectedIds: new Set() })
    await get().fetchMedia(1, get().activeCategoryId)
  },

  updateItem: async (id, updates) => {
    await invoke('media:update', { id, updates })
    set({
      items: get().items.map(item => item.id === id ? { ...item, ...updates } : item),
    })
  },

  createCategory: async (name, parentId) => {
    await invoke('category:create', { name, parentId })
    await get().fetchCategories()
  },

  deleteCategory: async (id) => {
    await invoke('category:delete', { id })
    await get().fetchCategories()
  },
}))
