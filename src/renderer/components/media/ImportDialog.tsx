import { useState, useCallback, useRef, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, UploadCloud } from 'lucide-react'
import { invoke, getPathForFile, onEvent } from '../../lib/ipc'
import { useMediaStore } from '../../store/mediaStore'
import { cn } from '../../lib/utils'
import type { ImportOptions } from '@shared/types'

const MEDIA_EXTS = new Set([
  'mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'flv', 'wmv',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tiff', 'tif',
])

function isMediaFile(name: string) {
  return MEDIA_EXTS.has(name.split('.').pop()?.toLowerCase() ?? '')
}

interface Props {
  open: boolean
  onClose: () => void
  initialFiles?: string[]
}

export default function ImportDialog({ open, onClose, initialFiles }: Props) {
  const { fetchMedia, fetchTags, categories } = useMediaStore()
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ imported: number; failed: string[] } | null>(null)
  const [importProgress, setImportProgress] = useState<{
    current: number
    total: number
    percentage: number
    filename: string
  } | null>(null)

  useEffect(() => {
    return onEvent('media:import-progress', (data) => {
      setImportProgress(data as { current: number; total: number; percentage: number; filename: string })
    })
  }, [])
  const [droppedFiles, setDroppedFiles] = useState<string[]>(initialFiles ?? [])
  const [dragging, setDragging] = useState(false)
  const dragCounter = useRef(0)
  const [options, setOptions] = useState<ImportOptions>({
    title: '',
    categoryId: '',
    tags: [],
    memo: '',
    rating: 0,
  })
  const [tagInput, setTagInput] = useState('')
  const [mode, setMode] = useState<'files' | 'folder'>('files')

  // Update dropped files when initialFiles changes
  const pendingFiles = droppedFiles.length > 0 ? droppedFiles : (initialFiles ?? [])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (dragCounter.current === 1) setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) setDragging(false)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setDragging(false)

    const paths: string[] = []
    for (const file of Array.from(e.dataTransfer.files)) {
      if (!isMediaFile(file.name)) continue
      try {
        const filePath = getPathForFile(file)
        if (filePath) paths.push(filePath)
      } catch { /* skip */ }
    }
    if (paths.length > 0) setDroppedFiles(prev => [...new Set([...prev, ...paths])])
  }, [])

  function addTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setOptions(o => ({ ...o, tags: [...(o.tags ?? []), trimmed] }))
    setTagInput('')
  }

  function removeTag(tag: string) {
    setOptions(o => ({ ...o, tags: (o.tags ?? []).filter(t => t !== tag) }))
  }

  async function handleImport() {
    setImporting(true)
    setProgress(null)
    setImportProgress(null)
    try {
      const cleanOptions: ImportOptions = {
        ...options,
        title: options.title?.trim() || undefined,
        categoryId: options.categoryId || undefined,
        memo: options.memo?.trim() || undefined,
      }

      let result: { imported: number; failed: string[] }

      if (pendingFiles.length > 0) {
        result = await invoke('media:import-files', { paths: pendingFiles, options: cleanOptions })
      } else if (mode === 'folder') {
        result = await invoke('media:import-folder', { folderPath: '', options: cleanOptions })
      } else {
        result = await invoke('media:import-files', { paths: [], options: cleanOptions })
      }

      setProgress(result)
      if (result.imported > 0) {
        await Promise.all([fetchMedia(), fetchTags()])
      }
    } finally {
      setImporting(false)
    }
  }

  function handleClose() {
    setProgress(null)
    setDroppedFiles([])
    setOptions({ title: '', categoryId: '', tags: [], memo: '', rating: 0 })
    setTagInput('')
    onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-vault-border bg-vault-surface p-6 shadow-2xl"
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {/* Drag overlay inside dialog */}
          {dragging && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-vault-accent bg-vault-bg/95 pointer-events-none">
              <UploadCloud className="h-12 w-12 text-vault-accent opacity-70" />
              <p className="text-sm font-medium text-vault-accent">ここにドロップ</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-vault-text">メディアを追加</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-vault-muted hover:text-vault-text"><X className="h-4 w-4" /></button>
            </Dialog.Close>
          </div>

          {importing && importProgress ? (
            /* ── Progress view ── */
            <div className="space-y-4 py-2">
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-vault-text">
                  追加中... {importProgress.current} / {importProgress.total} 件
                </p>
                <p className="text-xs text-vault-muted truncate">{importProgress.filename}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-vault-muted">
                  <span>{importProgress.percentage}%</span>
                  <span>{importProgress.current}/{importProgress.total}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-vault-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-vault-accent transition-all duration-300"
                    style={{ width: `${importProgress.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ) : importing ? (
            /* ── Spinner (before first progress event) ── */
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-vault-border border-t-vault-accent" />
              <p className="text-sm text-vault-muted">準備中...</p>
            </div>
          ) : progress ? (
            <div className="space-y-3">
              <p className="text-sm text-vault-text">
                <span className="text-green-400 font-medium">{progress.imported} 件</span> 追加完了
                {progress.failed.length > 0 && (
                  <span className="text-red-400"> / {progress.failed.length} 件失敗</span>
                )}
              </p>
              {progress.failed.length > 0 && (
                <ul className="max-h-32 overflow-y-auto space-y-1">
                  {progress.failed.map(f => (
                    <li key={f} className="text-xs text-red-400 truncate">{f}</li>
                  ))}
                </ul>
              )}
              <button onClick={handleClose} className="w-full rounded-lg bg-vault-accent px-4 py-2 text-sm font-medium text-white hover:bg-vault-accent-hover">
                閉じる
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Drop zone — shown when no files yet */}
              {pendingFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-vault-border py-8 text-vault-muted">
                  <UploadCloud className="h-8 w-8 opacity-40" />
                  <p className="text-sm">ここにドロップ、または下のボタンで選択</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border border-vault-border bg-vault-bg px-3 py-2">
                  <span className="text-sm text-vault-text">{pendingFiles.length} 件のファイル</span>
                  <button onClick={() => setDroppedFiles([])} className="text-xs text-vault-muted hover:text-red-400">クリア</button>
                </div>
              )}

              {/* Mode toggle — only when no files dropped */}
              {pendingFiles.length === 0 && (
                <div className="flex rounded-lg border border-vault-border overflow-hidden">
                  {(['files', 'folder'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'flex-1 py-1.5 text-sm transition-colors',
                        mode === m ? 'bg-vault-accent text-white' : 'text-vault-muted hover:text-vault-text'
                      )}
                    >
                      {m === 'files' ? 'ファイル選択' : 'フォルダ選択'}
                    </button>
                  ))}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="mb-1 block text-xs text-vault-muted">タイトル（省略時はファイル名）</label>
                <input
                  type="text"
                  value={options.title ?? ''}
                  onChange={e => setOptions(o => ({ ...o, title: e.target.value }))}
                  placeholder="タイトル"
                  className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none"
                />
              </div>

              {/* Category */}
              {categories.length > 0 && (
                <div>
                  <label className="mb-1 block text-xs text-vault-muted">カテゴリー</label>
                  <select
                    value={options.categoryId ?? ''}
                    onChange={e => setOptions(o => ({ ...o, categoryId: e.target.value }))}
                    className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text focus:border-vault-accent focus:outline-none"
                  >
                    <option value="">なし</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="mb-1 block text-xs text-vault-muted">タグ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                    placeholder="Enter で追加"
                    className="flex-1 rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none"
                  />
                  <button onClick={() => addTag(tagInput)} className="rounded-lg border border-vault-border px-3 text-sm text-vault-muted hover:text-vault-text">追加</button>
                </div>
                {(options.tags ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(options.tags ?? []).map(tag => (
                      <span key={tag} className="flex items-center gap-1 rounded bg-vault-border px-2 py-0.5 text-xs text-vault-text">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-vault-muted hover:text-red-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div>
                <label className="mb-1 block text-xs text-vault-muted">評価</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setOptions(o => ({ ...o, rating: o.rating === n ? 0 : n }))}
                      className={cn('text-lg', (options.rating ?? 0) >= n ? 'text-yellow-400' : 'text-vault-border')}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Memo */}
              <div>
                <label className="mb-1 block text-xs text-vault-muted">メモ</label>
                <textarea
                  value={options.memo ?? ''}
                  onChange={e => setOptions(o => ({ ...o, memo: e.target.value }))}
                  rows={2}
                  className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full rounded-lg bg-vault-accent px-4 py-2 text-sm font-medium text-white hover:bg-vault-accent-hover disabled:opacity-50"
              >
                {importing
                  ? '追加中...'
                  : pendingFiles.length > 0
                  ? `${pendingFiles.length} 件を追加`
                  : mode === 'folder'
                  ? 'フォルダを選択して追加'
                  : 'ファイルを選択して追加'}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
