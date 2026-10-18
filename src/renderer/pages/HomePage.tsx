import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMediaStore } from '../store/mediaStore'
import MediaGrid from '../components/media/MediaGrid'
import SearchBar from '../components/search/SearchBar'
import ImportButton from '../components/media/ImportButton'
import BulkEditBar from '../components/media/BulkEditBar'
import { useDragDrop } from '../hooks/useDragDrop'

export default function HomePage() {
  const [searchParams] = useSearchParams()
  const { fetchMedia, search, isLoading, totalItems, selectedIds, selectAll, clearSelection } = useMediaStore()
  const [query, setQuery] = useState('')
  const [droppedFiles, setDroppedFiles] = useState<string[]>([])

  const q = searchParams.get('q') ?? ''
  const cat = searchParams.get('cat') ?? undefined

  useEffect(() => {
    if (q) {
      setQuery(q)
      search(q)
    } else {
      setQuery('')
      fetchMedia(1, cat)
    }
  // fetchMedia/search are stable Zustand actions — safe to exclude
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat])

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    if (value.trim()) search(value)
    else fetchMedia(1, cat)
  }, [search, fetchMedia, cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cmd+A: select all / Escape: clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        selectAll()
      }
      if (e.key === 'Escape') clearSelection()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectAll, clearSelection])

  const { dragging, onDragEnter, onDragLeave, onDragOver, onDrop } = useDragDrop(setDroppedFiles)

  return (
    <div
      className="flex h-full flex-col"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-center gap-3 border-b border-vault-border bg-vault-surface/50 px-4 py-3">
        <SearchBar value={query} onChange={handleSearch} />
        <ImportButton
          droppedFiles={droppedFiles.length > 0 ? droppedFiles : undefined}
          onDropHandled={() => setDroppedFiles([])}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-vault-accent bg-vault-bg/90 pointer-events-none">
            <svg className="h-16 w-16 text-vault-accent opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-lg font-medium text-vault-accent">ここにドロップして追加</p>
            <p className="text-sm text-vault-muted">動画・画像ファイルに対応</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 shrink-0">
          <span className="text-xs text-vault-muted">
            {isLoading ? '読み込み中...' : `${totalItems.toLocaleString()} 件`}
          </span>
          {selectedIds.size === 0 && (
            <span className="text-xs text-vault-muted">⌘A で全選択</span>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <MediaGrid />
        </div>

        <BulkEditBar />
      </div>
    </div>
  )
}
