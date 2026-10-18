import { useEffect, useRef, useState, useCallback } from 'react'

interface VirtualGridOptions {
  itemCount: number
  columns: number
  itemHeight: number
  gap: number
  overscan?: number
}

export function useVirtualGrid({
  itemCount,
  columns,
  itemHeight,
  gap,
  overscan = 3,
}: VirtualGridOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)

  const rowCount = Math.ceil(itemCount / columns)
  const rowHeight = itemHeight + gap
  const totalHeight = rowCount * rowHeight

  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endRow = Math.min(rowCount - 1, Math.floor((scrollTop + containerHeight) / rowHeight) + overscan)

  const startIndex = startRow * columns
  const endIndex = Math.min(itemCount - 1, (endRow + 1) * columns - 1)

  const offsetY = startRow * rowHeight

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop((e.target as HTMLDivElement).scrollTop)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setContainerHeight(entries[0].contentRect.height)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  return {
    containerRef,
    onScroll,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
  }
}
