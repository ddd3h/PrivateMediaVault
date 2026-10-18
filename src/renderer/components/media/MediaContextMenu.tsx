import { useNavigate } from 'react-router-dom'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Play, ImageIcon, Pencil, Heart, Trash2 } from 'lucide-react'
import type { MediaItem } from '@shared/types'
import { invoke } from '../../lib/ipc'
import { useMediaStore } from '../../store/mediaStore'

interface Props {
  item: MediaItem
  children: React.ReactNode
  onEdit: () => void
}

export default function MediaContextMenu({ item, children, onEdit }: Props) {
  const navigate = useNavigate()
  const { fetchMedia, currentPage, updateItem } = useMediaStore()

  async function handleDelete() {
    if (!confirm(`「${item.title}」を削除しますか？`)) return
    await invoke('media:delete', { ids: [item.id] })
    await fetchMedia(currentPage)
  }

  async function toggleFavorite() {
    await updateItem(item.id, { favorite: !item.favorite })
  }

  function handleOpen() {
    navigate(item.mediaType === 'video' ? `/player/${item.id}` : `/viewer/${item.id}`)
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div style={{ display: 'block', height: '100%' }}>{children}</div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="z-50 min-w-[180px] rounded-lg border border-vault-border bg-vault-surface py-1 shadow-xl"
          onCloseAutoFocus={e => e.preventDefault()}
        >
          <MenuItem
            icon={item.mediaType === 'video' ? <Play className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
            label={item.mediaType === 'video' ? '再生' : '表示'}
            onClick={handleOpen}
          />

          <ContextMenu.Separator className="my-1 h-px bg-vault-border" />

          <MenuItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            label="タイトル・タグを編集"
            onClick={onEdit}
          />

          <MenuItem
            icon={<Heart className="h-3.5 w-3.5" fill={item.favorite ? 'currentColor' : 'none'} />}
            label={item.favorite ? 'お気に入りから削除' : 'お気に入りに追加'}
            onClick={toggleFavorite}
          />

          <ContextMenu.Separator className="my-1 h-px bg-vault-border" />

          <MenuItem
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="削除"
            onClick={handleDelete}
            danger
          />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

function MenuItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <ContextMenu.Item
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-xs outline-none select-none transition-colors ${
        danger
          ? 'text-red-400 hover:bg-red-950/50 focus:bg-red-950/50'
          : 'text-vault-text hover:bg-vault-border focus:bg-vault-border'
      }`}
    >
      {icon}
      {label}
    </ContextMenu.Item>
  )
}
