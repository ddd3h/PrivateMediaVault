import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVaultStore } from '../store/vaultStore'
import { useMediaStore } from '../store/mediaStore'
import { invoke } from '../lib/ipc'

export default function UnlockPage() {
  const { status, unlock, debugInfo } = useVaultStore()
  const { fetchMedia, fetchCategories, fetchTags } = useMediaStore()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [mounting, setMounting] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [waitingForMount, setWaitingForMount] = useState(false)

  // Check mount status on load and periodically after mounting
  const checkMount = useCallback(async () => {
    const res = await invoke<{ mounted: boolean }>('vault:check-mount')
    setMounted(res.mounted)
    return res.mounted
  }, [])

  useEffect(() => {
    checkMount()
  }, [checkMount])

  // Poll after user opens disk image
  useEffect(() => {
    if (!waitingForMount) return
    const interval = setInterval(async () => {
      const isMounted = await checkMount()
      if (isMounted) {
        setWaitingForMount(false)
        clearInterval(interval)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [waitingForMount, checkMount])

  async function handleMountImage() {
    setMounting(true)
    setError(null)
    try {
      const res = await invoke<{ success: boolean; alreadyMounted?: boolean; opened?: boolean; error?: string }>('vault:mount-image')
      if (res.alreadyMounted) {
        setMounted(true)
      } else if (res.opened) {
        // macOS is mounting asynchronously — start polling
        setWaitingForMount(true)
      } else if (res.error && res.error !== 'canceled') {
        setError(`マウント失敗: ${res.error}`)
      }
    } finally {
      setMounting(false)
    }
  }

  async function handleUnlock() {
    setError(null)
    setChecking(true)
    try {
      const ok = await unlock()
      if (ok) {
        await Promise.all([fetchMedia(), fetchCategories(), fetchTags()])
        navigate('/', { replace: true })
      } else {
        setError('接続失敗')
      }
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (status === 'unlocked') navigate('/', { replace: true })
  }, [status, navigate])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-vault-bg">
      <div className="w-full max-w-sm space-y-5 px-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-vault-surface border border-vault-border">
            <svg className="h-8 w-8 text-vault-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-vault-text">Private Media Vault</h1>
        </div>

        {/* Mount status */}
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
          mounted
            ? 'border-green-900/50 bg-green-950/30 text-green-400'
            : 'border-vault-border bg-vault-surface text-vault-muted'
        }`}>
          <div className={`h-2 w-2 rounded-full ${mounted ? 'bg-green-400' : 'bg-vault-muted'} ${waitingForMount ? 'animate-pulse' : ''}`} />
          {mounted
            ? '/Volumes/SecretLibrary マウント済み'
            : waitingForMount
            ? 'マウント待機中...'
            : '/Volumes/SecretLibrary 未マウント'}
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-900/50 px-4 py-3 text-sm text-red-300 space-y-1">
            <p>{error}</p>
            {debugInfo && <p className="text-xs font-mono opacity-70 break-all">{debugInfo}</p>}
          </div>
        )}

        {/* Mount button — shown when not mounted */}
        {!mounted && (
          <button
            onClick={handleMountImage}
            disabled={mounting || waitingForMount}
            className="w-full rounded-lg border border-vault-border bg-vault-surface px-4 py-2.5 text-sm text-vault-text transition-colors hover:border-vault-accent hover:text-vault-accent disabled:opacity-50"
          >
            {mounting ? '選択中...' : 'ディスクイメージをマウント'}
          </button>
        )}

        {/* Unlock button — only enabled when mounted */}
        <button
          onClick={handleUnlock}
          disabled={!mounted || checking || status === 'unlocking'}
          className="w-full rounded-lg bg-vault-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-vault-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {checking || status === 'unlocking' ? '接続中...' : 'Vault を開く'}
        </button>

        {!mounted && (
          <p className="text-center text-xs text-vault-muted">
            .dmg / .sparseimage をマウントするか、Finder から手動でマウントしてください
          </p>
        )}
      </div>
    </div>
  )
}
