import { execFileSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { THUMBNAILS_PATH } from '../db'

function findBinary(name: string): string {
  // 1. Bundled inside .app Resources
  if (process.resourcesPath) {
    const bundled = join(process.resourcesPath, 'bin', name)
    if (existsSync(bundled)) return bundled
  }

  // 2. Homebrew / system paths
  const candidates = [
    `/opt/homebrew/bin/${name}`,
    `/usr/local/bin/${name}`,
    `/usr/bin/${name}`,
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }

  return name
}

const FFMPEG_PATH = findBinary('ffmpeg')
const FFPROBE_PATH = findBinary('ffprobe')

export interface MediaMetadata {
  width: number | null
  height: number | null
  duration: number | null
  mimeType: string
}

export function ensureThumbnailDir(): void {
  if (!existsSync(THUMBNAILS_PATH)) {
    mkdirSync(THUMBNAILS_PATH, { recursive: true })
  }
}

export function generateVideoThumbnail(filePath: string, mediaId: string): string | null {
  ensureThumbnailDir()
  const thumbPath = join(THUMBNAILS_PATH, `${mediaId}.jpg`)
  try {
    execFileSync(FFMPEG_PATH, [
      '-ss', '00:00:05',
      '-i', filePath,
      '-frames:v', '1',
      '-vf', 'scale=320:-1',
      '-q:v', '3',
      '-update', '1',
      '-y',
      thumbPath,
    ], { timeout: 30000 })
    return thumbPath
  } catch {
    // Try at 1 second if 5 second seek fails
    try {
      execFileSync(FFMPEG_PATH, [
        '-ss', '00:00:01',
        '-i', filePath,
        '-frames:v', '1',
        '-vf', 'scale=320:-1',
        '-q:v', '3',
        '-update', '1',
        '-y',
        thumbPath,
      ], { timeout: 30000 })
      return thumbPath
    } catch {
      return null
    }
  }
}

export function generateImageThumbnail(filePath: string, mediaId: string): string | null {
  ensureThumbnailDir()
  const thumbPath = join(THUMBNAILS_PATH, `${mediaId}.jpg`)
  try {
    execFileSync(FFMPEG_PATH, [
      '-i', filePath,
      '-frames:v', '1',
      '-vf', 'scale=320:-1',
      '-q:v', '3',
      '-update', '1',
      '-y',
      thumbPath,
    ], { timeout: 30000 })
    return thumbPath
  } catch {
    return null
  }
}

export function extractMetadata(filePath: string): MediaMetadata {
  try {
    const output = execFileSync(FFPROBE_PATH, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      filePath,
    ], { timeout: 15000 }).toString()

    const data = JSON.parse(output)
    const videoStream = data.streams?.find((s: { codec_type: string }) => s.codec_type === 'video')
    const duration = data.format?.duration ? parseFloat(data.format.duration) : null
    const mimeType = guessMimeType(filePath)

    return {
      width: videoStream?.width ?? null,
      height: videoStream?.height ?? null,
      duration,
      mimeType,
    }
  } catch {
    return { width: null, height: null, duration: null, mimeType: guessMimeType(filePath) }
  }
}

function guessMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', mkv: 'video/x-matroska',
    avi: 'video/x-msvideo', webm: 'video/webm', m4v: 'video/mp4',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    bmp: 'image/bmp', tiff: 'image/tiff', tif: 'image/tiff',
  }
  return map[ext] ?? 'application/octet-stream'
}
