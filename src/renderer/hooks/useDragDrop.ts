import { useState, useCallback, useRef } from 'react'
import { getPathForFile } from '../lib/ipc'

const MEDIA_EXTS = new Set([
  'mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'flv', 'wmv',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff', 'tif',
])

function isMediaFile(name: string): boolean {
  return MEDIA_EXTS.has(name.split('.').pop()?.toLowerCase() ?? '')
}

export function useDragDrop(onDrop: (paths: string[]) => void) {
  const [dragging, setDragging] = useState(false)
  const counter = useRef(0)

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    counter.current++
    if (counter.current === 1) setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    counter.current--
    if (counter.current === 0) setDragging(false)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDropHandler = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    counter.current = 0
    setDragging(false)

    const paths: string[] = []
    for (const file of Array.from(e.dataTransfer.files)) {
      if (!isMediaFile(file.name)) continue
      try {
        const filePath = getPathForFile(file)
        if (filePath) paths.push(filePath)
      } catch { /* skip */ }
    }
    if (paths.length > 0) onDrop(paths)
  }, [onDrop])

  return { dragging, onDragEnter, onDragLeave, onDragOver, onDrop: onDropHandler }
}
