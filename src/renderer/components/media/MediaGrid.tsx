import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMediaStore } from '../../store/mediaStore'
import { useVirtualGrid } from '../../hooks/useVirtualGrid'
import { useLazyImage } from '../../hooks/useLazyImage'
import MediaContextMenu from './MediaContextMenu'
import EditMediaDialog from './EditMediaDialog'
import type { MediaItem } from '@shared/types'

const COLUMNS = 4
const ITEM_HEIGHT = 200
const GAP = 8

export default function MediaGrid() {
  const { items, selectedIds, toggleSelect, totalItems, currentPage, pageSize, fetchMedia, isLoading } = useMediaStore()
  const navigate = useNavigate()
  const [editItem, setEditItem] = useState<MediaItem | null>(null)

  const { containerRef, onScroll, totalHeight, offsetY, startIndex, endIndex } = useVirtualGrid({
    itemCount: items.length,
    columns: COLUMNS,
    itemHeight: ITEM_HEIGHT,
    gap: GAP,
  })

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    onScroll(e)
    // Infinite scroll: load next page when near bottom
    const el = e.target as HTMLDivElement
    if (!isLoading && el.scrollTop + el.clientHeight > el.scrollHeight - 400) {
      const hasMore = currentPage * pageSize < totalItems
      if (hasMore) fetchMedia(currentPage + 1)
    }
  }, [onScroll, isLoading, currentPage, pageSize, totalItems, fetchMedia])

  if (items.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-vault-muted">
        <svg className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        <p className="text-sm">メディアがありません</p>
      </div>
    )
  }

  const visibleItems = items.slice(startIndex, endIndex + 1)

  return (
    <>
      <div
        ref={containerRef}
        className="h-full overflow-y-auto"
        onScroll={handleScroll}
        style={{ contain: 'strict' }}
      >
        <div style={{ height: totalHeight, position: 'relative', padding: `0 ${GAP}px` }}>
          <div
            style={{
              position: 'absolute',
              top: offsetY + GAP,
              left: GAP,
              right: GAP,
              display: 'grid',
              gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
              gap: GAP,
            }}
          >
            {visibleItems.map((item) => (
              <MediaContextMenu
                key={item.id}
                item={item}
                onEdit={() => setEditItem(item)}
              >
                <MediaCard
                  item={item}
                  selected={selectedIds.has(item.id)}
                  onSelect={() => toggleSelect(item.id)}
                  onOpen={() => navigate(item.mediaType === 'video' ? `/player/${item.id}` : `/viewer/${item.id}`)}
                />
              </MediaContextMenu>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-vault-border border-t-vault-accent" />
          </div>
        )}
      </div>

      <EditMediaDialog item={editItem} onClose={() => setEditItem(null)} />
    </>
  )
}

function MediaCard({ item, selected, onSelect, onOpen }: {
  item: MediaItem
  selected: boolean
  onSelect: () => void
  onOpen: () => void
}) {
  const { ref, visible, loaded, setLoaded } = useLazyImage(item.thumbnailPath)

  return (
    <div
      ref={ref}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('text/x-media-id', item.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-all ${
        selected ? 'border-vault-accent ring-1 ring-vault-accent' : 'border-vault-border hover:border-vault-muted'
      }`}
      onClick={onOpen}
      style={{ height: ITEM_HEIGHT }}
    >
      <div className="relative aspect-video bg-vault-surface">
        {visible && item.thumbnailPath ? (
          <>
            {!loaded && <div className="absolute inset-0 animate-pulse bg-vault-border" />}
            <img
              src={`file://${item.thumbnailPath}`}
              alt={item.title}
              className={`h-full w-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
              draggable={false}
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-vault-muted">
            {item.mediaType === 'video' ? (
              <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            ) : (
              <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Resolution badge — top right */}
      {item.width && item.height && (
        <div className="absolute right-2 top-2 rounded bg-black/60 px-1 py-0.5 text-xs text-white/80 font-medium">
          {getResolutionLabel(item.width, item.height)}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <p className="truncate text-xs text-white">{item.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          {item.favorite && (
            <svg className="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          )}
          {item.rating > 0 && (
            <span className="text-xs text-yellow-400">{'★'.repeat(item.rating)}</span>
          )}
          {item.mediaType === 'video' && item.duration && (
            <span className="ml-auto rounded bg-black/60 px-1 text-xs text-white">{formatDuration(item.duration)}</span>
          )}
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onSelect() }}
        className={`absolute left-2 top-2 h-5 w-5 rounded border transition-all ${
          selected
            ? 'border-vault-accent bg-vault-accent text-white'
            : 'border-white/50 bg-black/40 text-transparent group-hover:text-white'
        }`}
      >
        {selected && (
          <svg className="h-full w-full p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
      </button>
    </div>
  )
}

function getResolutionLabel(width: number, height: number): string {
  const h = Math.min(width, height) // short side for portrait videos too
  const long = Math.max(width, height)
  if (long >= 7680 || h >= 4320) return '8K'
  if (long >= 3840 || h >= 2160) return '4K'
  if (h >= 1440) return '2K'
  if (h >= 1080) return '1080p'
  if (h >= 720) return '720p'
  if (h >= 480) return '480p'
  if (h >= 360) return '360p'
  return `${height}p`
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
