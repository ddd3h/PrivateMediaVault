import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FolderPlus, Trash2, LayoutGrid } from 'lucide-react'
import { useMediaStore } from '../../store/mediaStore'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { categories, createCategory, deleteCategory, updateItem, fetchMedia } = useMediaStore()
  const [newCatName, setNewCatName] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dragOverCat, setDragOverCat] = useState<string | null>(null)

  const searchParams = new URLSearchParams(location.search)
  const activeCat = searchParams.get('cat')

  async function handleCreateCategory() {
    const name = newCatName.trim()
    if (!name) return
    await createCategory(name)
    setNewCatName('')
    setShowNewCat(false)
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`カテゴリー「${name}」を削除しますか？\n（メディアは削除されません）`)) return
    setDeletingId(id)
    try {
      await deleteCategory(id)
      if (activeCat === id) navigate('/')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDropOnCategory(e: React.DragEvent, categoryId: string) {
    e.preventDefault()
    setDragOverCat(null)
    const mediaId = e.dataTransfer.getData('text/x-media-id')
    if (!mediaId) return
    await updateItem(mediaId, { categoryId })
    await fetchMedia(1, activeCat ?? undefined)
  }

  async function handleDropOnAll(e: React.DragEvent) {
    e.preventDefault()
    setDragOverCat(null)
    const mediaId = e.dataTransfer.getData('text/x-media-id')
    if (!mediaId) return
    await updateItem(mediaId, { categoryId: null })
    await fetchMedia(1, activeCat ?? undefined)
  }

  return (
    <aside className="flex w-56 flex-col border-r border-vault-border bg-vault-surface overflow-hidden">
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* All — also a drop target to remove category */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOverCat('__all__') }}
          onDragLeave={() => setDragOverCat(null)}
          onDrop={handleDropOnAll}
          className={`rounded-md transition-colors ${dragOverCat === '__all__' ? 'ring-1 ring-vault-accent bg-vault-accent/10' : ''}`}
        >
          <SidebarItem
            label="すべて"
            icon={<LayoutGrid className="h-4 w-4 shrink-0" />}
            active={!activeCat && location.pathname === '/'}
            onClick={() => navigate('/')}
          />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1 px-1">
            <p className="text-xs font-medium uppercase tracking-wider text-vault-muted">カテゴリー</p>
            <button
              onClick={() => setShowNewCat(v => !v)}
              className="text-vault-muted hover:text-vault-accent transition-colors"
              title="カテゴリー追加"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>

          {showNewCat && (
            <div className="mb-2 flex gap-1">
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateCategory()
                  if (e.key === 'Escape') { setShowNewCat(false); setNewCatName('') }
                }}
                placeholder="カテゴリー名"
                autoFocus
                className="flex-1 rounded border border-vault-border bg-vault-bg px-2 py-1 text-xs text-vault-text placeholder-vault-muted focus:border-vault-accent focus:outline-none"
              />
              <button onClick={handleCreateCategory} className="rounded border border-vault-border px-1.5 text-xs text-vault-muted hover:text-vault-text">
                追加
              </button>
            </div>
          )}

          {categories.length === 0 && !showNewCat && (
            <p className="px-2 text-xs text-vault-muted opacity-50">なし</p>
          )}

          {categories.map(cat => (
            <div
              key={cat.id}
              className={`group flex items-center rounded-md transition-colors ${
                dragOverCat === cat.id ? 'ring-1 ring-vault-accent bg-vault-accent/10' : ''
              }`}
              onDragOver={e => { e.preventDefault(); setDragOverCat(cat.id) }}
              onDragLeave={() => setDragOverCat(null)}
              onDrop={e => handleDropOnCategory(e, cat.id)}
            >
              <SidebarItem
                label={cat.name}
                icon={
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v8.25A2.25 2.25 0 004.5 16.5h15a2.25 2.25 0 002.25-2.25v-6A2.25 2.25 0 0019.5 6H9.81z" />
                  </svg>
                }
                active={activeCat === cat.id}
                onClick={() => navigate(`/?cat=${cat.id}`)}
                className="flex-1 min-w-0"
              />
              <button
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                disabled={deletingId === cat.id}
                className="mr-1 hidden group-hover:flex text-vault-muted hover:text-red-400 transition-colors disabled:opacity-50"
                title="削除"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}

function SidebarItem({ label, icon, active, onClick, className = '' }: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
        active
          ? 'bg-vault-accent text-white'
          : 'text-vault-muted hover:bg-vault-border hover:text-vault-text'
      } ${className}`}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  )
}
