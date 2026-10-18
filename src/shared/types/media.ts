export type MediaType = 'video' | 'image'

export interface MediaItem {
  id: string
  title: string
  originalFilename: string
  filePath: string
  mediaType: MediaType
  mimeType: string
  fileSize: number
  width: number | null
  height: number | null
  duration: number | null
  thumbnailPath: string | null
  categoryId: string | null
  tags: string[]
  memo: string | null
  favorite: boolean
  rating: number
  createdAt: string
  updatedAt: string
  capturedAt: string | null
}

export interface Category {
  id: string
  name: string
  parentId: string | null
  sortOrder: number
  createdAt: string
}

export interface Tag {
  id: string
  name: string
  usageCount: number
}

export interface ImportOptions {
  title?: string
  categoryId?: string
  tags?: string[]
  memo?: string
  favorite?: boolean
  rating?: number
  capturedAt?: string
}

export interface SearchQuery {
  raw: string
  filters: SearchFilter[]
}

export interface SearchFilter {
  type: 'text' | 'tag' | 'mediaType' | 'favorite' | 'width' | 'height' | 'date' | 'rating' | 'category'
  operator?: '>=' | '<=' | '>' | '<' | '=' | 'range'
  value: string | number | boolean | [string, string]
}

export interface SearchResult {
  items: MediaItem[]
  total: number
  page: number
  pageSize: number
}
