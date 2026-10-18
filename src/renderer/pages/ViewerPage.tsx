import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invoke, onEvent } from '../lib/ipc'
import { useMediaStore } from '../store/mediaStore'
import Slideshow from '../components/media/Slideshow'
import type { MediaItem } from '@shared/types'

export default function ViewerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [item, setItem] = useState<MediaItem | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [slideshow, setSlideshow] = useState(false)
  const { items } = useMediaStore()

  useEffect(() => {
    if (!id) return
    invoke<MediaItem | null>('media:get', { id }).then(setItem)
  }, [id])

  useEffect(() => {
    return onEvent('playback:stop', () => navigate('/', { replace: true }))
  }, [navigate])

  // Keyboard: ← → for prev/next in store
  useEffect(() => {
    const imageItems = items.filter(i => i.mediaType === 'image')
    const handler = (e: KeyboardEvent) => {
      if (!item) return
      const idx = imageItems.findIndex(i => i.id === item.id)
      if (e.key === 'ArrowRight' && idx < imageItems.length - 1) navigate(`/viewer/${imageItems[idx + 1].id}`)
      if (e.key === 'ArrowLeft' && idx > 0) navigate(`/viewer/${imageItems[idx - 1].id}`)
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [item, items, navigate])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.min(8, Math.max(0.1, z - e.deltaY * 0.001)))
  }

  function rotate(deg: number) {
    setRotation(r => (r + deg + 360) % 360)
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current?.requestFullscreen()
  }

  if (!item) {
    return <div className="flex h-full items-center justify-center text-vault-muted">読み込み中...</div>
  }

  const imageItems = items.filter(i => i.mediaType === 'image')
  const startIndex = imageItems.findIndex(i => i.id === item.id)

  return (
    <>
      <div ref={containerRef} className="flex h-full flex-col bg-black">
        <div className="flex items-center gap-2 bg-vault-surface/80 px-4 py-2">
          <button onClick={() => navigate(-1)} className="text-vault-muted hover:text-vault-text">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="flex-1 truncate text-sm text-vault-text">{item.title}</span>

          <button onClick={() => rotate(-90)} className="text-vault-muted hover:text-vault-text" title="左回転">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
          </button>
          <button onClick={() => rotate(90)} className="text-vault-muted hover:text-vault-text" title="右回転">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
            </svg>
          </button>
          <button onClick={() => setZoom(1)} className="text-xs text-vault-muted hover:text-vault-text">
            {Math.round(zoom * 100)}%
          </button>

          {imageItems.length > 1 && (
            <button
              onClick={() => setSlideshow(true)}
              className="text-vault-muted hover:text-vault-accent transition-colors"
              title="スライドショー"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </button>
          )}

          <button onClick={toggleFullscreen} className="text-vault-muted hover:text-vault-text">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
        </div>

        <div
          className="flex flex-1 items-center justify-center overflow-hidden"
          onWheel={handleWheel}
        >
          <img
            src={`file://${item.filePath}`}
            alt={item.title}
            draggable={false}
            onContextMenu={e => e.preventDefault()}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transition: 'transform 0.1s ease',
            }}
          />
        </div>
      </div>

      {slideshow && (
        <Slideshow
          items={imageItems}
          startIndex={startIndex >= 0 ? startIndex : 0}
          onClose={() => setSlideshow(false)}
        />
      )}
    </>
  )
}
