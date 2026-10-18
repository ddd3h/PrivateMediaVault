import { useVaultStore } from '../../store/vaultStore'
import { Lock } from 'lucide-react'

export default function TitleBar() {
  const { lock } = useVaultStore()

  return (
    <div className="drag-region flex h-10 items-center justify-between border-b border-vault-border bg-vault-surface">
      <div className="w-20 shrink-0" />

      <span className="text-xs font-medium text-vault-muted">Private Media Vault</span>

      <div className="no-drag flex items-center mr-2">
        <button
          onClick={lock}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-vault-muted transition-colors hover:bg-vault-border hover:text-vault-text"
          title="ライブラリをロック"
        >
          <Lock className="h-3.5 w-3.5" />
          ロック
        </button>
      </div>
    </div>
  )
}
