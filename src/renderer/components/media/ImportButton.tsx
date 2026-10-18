import { useState } from 'react'
import { Plus } from 'lucide-react'
import ImportDialog from './ImportDialog'

interface Props {
  droppedFiles?: string[]
  onDropHandled?: () => void
}

export default function ImportButton({ droppedFiles, onDropHandled }: Props) {
  const [open, setOpen] = useState(false)

  // Auto-open when files dropped
  if (droppedFiles && droppedFiles.length > 0 && !open) {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
    onDropHandled?.()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-vault-border bg-vault-surface px-3 py-2 text-sm text-vault-text transition-colors hover:border-vault-accent hover:text-vault-accent shrink-0"
      >
        <Plus className="h-4 w-4" />
        追加
      </button>
      <ImportDialog
        open={open}
        onClose={handleClose}
        initialFiles={droppedFiles}
      />
    </>
  )
}
