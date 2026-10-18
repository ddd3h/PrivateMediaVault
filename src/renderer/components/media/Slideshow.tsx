import { useState, useEffect, useCallback, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import type { MediaItem } from '@shared/types'

interface Props {
  items: MediaItem[]
  startIndex: number
  onClose: () => void
}

const INTERVALS = [2000, 3000, 5000, 8000]

export default function Slideshow({ items, startIndex, onClose }: Props) {
  const imageItems = items.filter(i => i.mediaType === 'image')
  const [index, setIndex] = useState(Math.min(startIndex, imageItems.length - 1))
  const [playing, setPlaying] = useState(true)
  const [intervalMs, setIntervalMs] = useState(3000)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = imageItems[index]

  const next = useCallback(() => {
    setIndex(i => (i + 1) % imageItems.length)
    setZoom(1)
    setRotation(0)
  }, [imageItems.length])

  const prev = useCallback(() => {
    setIndex(i => (i - 1 + imageItems.length) % imageItems.length)
    setZoom(1)
    setRotation(0)
  }, [imageItems.length])

  useEffect(() => {
    if (!playing) return
    timerRef.current = setTimeout(next, intervalMs)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, intervalMs, index, next])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, next, prev])

  if (!current) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Controls overlay */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 py-3 z-10">
        <span className="text-sm text-white/70">{index + 1} / {imageItems.length}</span>
        <div className="flex items-center gap-2">
          {/* Interval selector */}
          <div className="flex gap-1">
            {INTERVALS.map(ms => (
              <button
                key={ms}
                onClick={() => setIntervalMs(ms)}
                className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                  intervalMs === ms ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {ms / 1000}s
              </button>
            ))}
          </div>
          <button onClick={onClose} className="ml-2 text-white/70 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex flex-1 items-center justify-center"
        onWheel={e => setZoom(z => Math.min(8, Math.max(0.1, z - e.deltaY * 0.001)))}
      >
        <img
          key={current.id}
          src={`file://${current.filePath}`}
          alt={current.title}
          draggable={false}
          onContextMenu={e => e.preventDefault()}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease',
          }}
        />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 bg-gradient-to-t from-black/70 to-transparent pb-6 pt-8 z-10">
        <button onClick={prev} className="text-white/70 hover:text-white transition-colors">
          <ChevronLeft className="h-8 w-8" />
        </button>

        <button onClick={() => setPlaying(p => !p)} className="text-white hover:text-white/80 transition-colors">
          {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
        </button>

        <button onClick={next} className="text-white/70 hover:text-white transition-colors">
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      <p className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/40 truncate px-8">
        {current.title}
      </p>
    </div>
  )
}
