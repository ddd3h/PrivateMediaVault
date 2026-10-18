import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { invoke } from '../../lib/ipc'
import { useMediaStore } from '../../store/mediaStore'
import { cn } from '../../lib/utils'
import type { MediaItem } from '@shared/types'

interface Props {
  item: MediaItem | null
  onClose: () => void
}

export default function EditMediaDialog({ item, onClose }: Props) {
  const { updateItem, categories } = useMediaStore()
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [memo, setMemo] = useState('')
  const [rating, setRating] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  useEffect(() => {
    if (!item) return
    setTitle(item.title)
    setCategoryId(item.categoryId ?? '')
    setMemo(item.memo ?? '')
    setRating(item.rating)
    setTags(item.tags ?? [])
  }, [item])

  async function handleSave() {
    if (!item) return
    setSaving(true)
    try {
      await updateItem(item.id, {
        title: title.trim() || item.title,
        categoryId: categoryId || null,
        memo: memo.trim() || null,
        rating,
      })
      await invoke('media:update-tags', { id: item.id, tags })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  function addTag(name: string) {
    const trimmed = name.trim()
    if (!trimmed || tags.includes(trimmed)) return
    setTags(t => [...t, trimmed])
    setTagInput('')
  }

  return (
    <Dialog.Root open={!!item} onOpenChange={v => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-vault-border bg-vault-surface p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold text-vault-text">編集</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-vault-muted hover:text-vault-text"><X className="h-4 w-4" /></button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-vault-muted">タイトル</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text focus:border-vault-accent focus:outline-none" />
            </div>

            {categories.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-vault-muted">カテゴリー</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text focus:border-vault-accent focus:outline-none">
                  <option value="">なし</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs text-vault-muted">タグ</label>
              <div className="flex gap-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }}
                  placeholder="Enter で追加"
                  className="flex-1 rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none" />
                <button onClick={() => addTag(tagInput)} className="rounded-lg border border-vault-border px-3 text-sm text-vault-muted hover:text-vault-text">追加</button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 rounded bg-vault-border px-2 py-0.5 text-xs text-vault-text">
                      {tag}
                      <button onClick={() => setTags(t => t.filter(x => x !== tag))} className="text-vault-muted hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs text-vault-muted">評価</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setRating(rating === n ? 0 : n)}
                    className={cn('text-lg', rating >= n ? 'text-yellow-400' : 'text-vault-border')}>★</button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-vault-muted">メモ</label>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2}
                className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none resize-none" />
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-lg border border-vault-border px-4 py-2 text-sm text-vault-muted hover:text-vault-text">
                キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 rounded-lg bg-vault-accent px-4 py-2 text-sm font-medium text-white hover:bg-vault-accent-hover disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
