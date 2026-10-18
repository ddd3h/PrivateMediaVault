import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { invoke, onEvent } from '../lib/ipc'
import { useMediaStore } from '../store/mediaStore'
import type { MediaItem } from '@shared/types'

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [item, setItem] = useState<MediaItem | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [thumbSaved, setThumbSaved] = useState(false)
  const [thumbError, setThumbError] = useState<string | null>(null)
  const { updateItem } = useMediaStore()

  useEffect(() => {
    if (!id) return
    invoke<MediaItem | null>('media:get', { id }).then(setItem)
  }, [id])

  useEffect(() => {
    return onEvent('playback:stop', () => {
      videoRef.current?.pause()
      navigate('/', { replace: true })
    })
  }, [navigate])

  const video = videoRef.current

  function togglePlay() {
    if (!video) return
    if (video.paused) video.play()
    else video.pause()
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    if (!video) return
    video.currentTime = Number(e.target.value)
  }

  function changeSpeed(s: number) {
    if (!video) return
    setSpeed(s)
    video.playbackRate = s
  }

  function toggleFullscreen() {
    if (!video) return
    if (document.fullscreenElement) document.exitFullscreen()
    else video.requestFullscreen()
  }

  async function captureAndSetThumbnail() {
    if (!video || !item) return
    setThumbError(null)
    video.pause()

    try {
      // Validate video has loaded dimensions
      if (!video.videoWidth || !video.videoHeight) {
        setThumbError('動画が読み込まれていません')
        return
      }

      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = Math.round(video.videoHeight * 320 / video.videoWidth)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setThumbError('Canvas 取得失敗')
        return
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      let dataUrl: string
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      } catch (e) {
        setThumbError(`キャプチャ失敗: ${(e as Error).message}`)
        return
      }

      // Check that we actually got image data (not blank)
      if (!dataUrl || dataUrl === 'data:,') {
        setThumbError('フレームが空です。別のタイミングで試してください')
        return
      }

      const result = await invoke<{ success: boolean; thumbnailPath: string; error?: string }>('media:set-thumbnail', {
        id: item.id,
        dataUrl,
      })

      if (result.success) {
        // Append cache-buster so MediaGrid reloads the image
        const busted = `${result.thumbnailPath}?t=${Date.now()}`
        await updateItem(item.id, { thumbnailPath: busted })
        setThumbSaved(true)
        setTimeout(() => setThumbSaved(false), 2000)
      } else {
        setThumbError(result.error ?? '保存失敗')
      }
    } catch (e) {
      setThumbError(`エラー: ${(e as Error).message}`)
    }
  }

  if (!item) {
    return <div className="flex h-full items-center justify-center text-vault-muted">読み込み中...</div>
  }

  return (
    <div className="flex h-full flex-col bg-black">
      <div className="flex items-center gap-2 bg-vault-surface/80 px-4 py-2">
        <button onClick={() => navigate(-1)} className="text-vault-muted hover:text-vault-text">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="flex-1 text-sm text-vault-text truncate">{item.title}</span>

        <div className="flex items-center gap-2">
          {thumbError && (
            <span className="text-xs text-red-400">{thumbError}</span>
          )}
          <button
            onClick={captureAndSetThumbnail}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors border border-vault-border text-vault-muted hover:border-vault-accent hover:text-vault-accent"
            title="現在のフレームをサムネイルに設定"
          >
            {thumbSaved ? (
              <span className="text-green-400">✓ 保存済み</span>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                サムネイル設定
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <video
          ref={videoRef}
          src={`file://${item.filePath}`}
          className="max-h-full max-w-full"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
          onContextMenu={e => e.preventDefault()}
        />
      </div>

      <div className="bg-vault-surface/90 px-4 py-3 space-y-2">
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          step={0.1}
          onChange={handleSeek}
          className="w-full accent-vault-accent"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-vault-text hover:text-vault-accent">
              {playing ? (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <span className="text-xs text-vault-muted">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[0.5, 1, 1.5, 2].map(s => (
              <button
                key={s}
                onClick={() => changeSpeed(s)}
                className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                  speed === s ? 'bg-vault-accent text-white' : 'text-vault-muted hover:text-vault-text'
                }`}
              >
                {s}x
              </button>
            ))}

            <button onClick={toggleFullscreen} className="ml-2 text-vault-muted hover:text-vault-text">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
