import { useState } from 'react'
import { X, Trash2, Tag, FolderOpen, Star } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { invoke } from '../../lib/ipc'
import { useMediaStore } from '../../store/mediaStore'
import { cn } from '../../lib/utils'

export default function BulkEditBar() {
  const { selectedIds, clearSelection, deleteSelected, fetchMedia, fetchTags, categories, activeCategoryId, items } = useMediaStore()
  const [open, setOpen] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const count = selectedIds.size
  if (count === 0) return null

  async function handleDelete() {
    if (!confirm(`${count} 件を削除しますか？`)) return
    await deleteSelected()
  }

  async function handleBulkApply() {
    setSaving(true)
    try {
      const ids = [...selectedIds]
      const updates: Record<string, unknown> = {}
      if (categoryId !== '') updates.categoryId = categoryId.trim() || null
      if (rating !== null) updates.rating = rating

      if (Object.keys(updates).length > 0) {
        await Promise.all(ids.map(id => invoke('media:update', { id, updates })))
      }

      if (tags.length > 0) {
        for (const id of ids) {
          const item = items.find(i => i.id === id)
          if (!item) continue
          const merged = [...new Set([...(item.tags ?? []), ...tags])]
          await invoke('media:update-tags', { id, tags: merged })
        }
        await fetchTags()
      }

      clearSelection()
      await fetchMedia(1, activeCategoryId)
      setOpen(false)
      setTags([])
      setCategoryId('')
      setRating(null)
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
    <div className="flex items-center gap-2 border-t border-vault-border bg-vault-surface px-4 py-2">
      <span className="text-sm text-vault-text font-medium">{count} 件選択中</span>

      <div className="flex items-center gap-1.5 ml-2">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-vault-muted border border-vault-border hover:border-vault-accent hover:text-vault-accent transition-colors"
        >
          <Tag className="h-3.5 w-3.5" />
          一括編集
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-red-400 border border-red-900/50 hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          削除
        </button>
      </div>

      <button onClick={clearSelection} className="ml-auto text-vault-muted hover:text-vault-text">
        <X className="h-4 w-4" />
      </button>

      <Dialog.Root open={open} onOpenChange={v => !v && setOpen(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-vault-border bg-vault-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-semibold text-vault-text">{count} 件を一括編集</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-vault-muted hover:text-vault-text"><X className="h-4 w-4" /></button>
              </Dialog.Close>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-xs text-vault-muted">未入力の項目は変更されません</p>

              <div>
                <label className="mb-1 block text-xs text-vault-muted">タグ追加 (既存に追記)</label>
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

              {categories.length > 0 && (
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs text-vault-muted">
                    <FolderOpen className="h-3.5 w-3.5" />
                    カテゴリー変更
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-vault-border bg-vault-bg px-3 py-1.5 text-sm text-vault-text focus:border-vault-accent focus:outline-none"
                  >
                    <option value="">変更しない</option>
                    <option value=" ">なし（未分類）</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs text-vault-muted">
                  <Star className="h-3.5 w-3.5" />
                  評価変更
                </label>
                <div className="flex items-center gap-1">
                  <button onClick={() => setRating(null)} className={cn('rounded px-2 py-0.5 text-xs border', rating === null ? 'border-vault-accent text-vault-accent' : 'border-vault-border text-vault-muted')}>
                    変更しない
                  </button>
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setRating(n)}
                      className={cn('text-base', rating === n ? 'text-yellow-400' : 'text-vault-border hover:text-yellow-400/50')}>
                      {n === 0 ? '☆' : '★'.repeat(n)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-vault-border px-4 py-2 text-sm text-vault-muted hover:text-vault-text">
                  キャンセル
                </button>
                <button onClick={handleBulkApply} disabled={saving}
                  className="flex-1 rounded-lg bg-vault-accent px-4 py-2 text-sm font-medium text-white hover:bg-vault-accent-hover disabled:opacity-50">
                  {saving ? '適用中...' : '適用'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
