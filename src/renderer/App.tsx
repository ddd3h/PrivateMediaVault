import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useVaultStore } from './store/vaultStore'
import { onEvent } from './lib/ipc'
import UnlockPage from './pages/UnlockPage'
import HomePage from './pages/HomePage'
import PlayerPage from './pages/PlayerPage'
import ViewerPage from './pages/ViewerPage'
import AppLayout from './components/layout/AppLayout'

export default function App() {
  const { status, setStatus } = useVaultStore()
  const navigate = useNavigate()

  useEffect(() => {
    const off = onEvent('vault:locked', () => {
      setStatus('locked')
      navigate('/unlock', { replace: true })
    })
    return off
  }, [setStatus, navigate])

  if (status === 'locked' || status === 'unlocking') {
    return <UnlockPage />
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="player/:id" element={<PlayerPage />} />
        <Route path="viewer/:id" element={<ViewerPage />} />
      </Route>
      <Route path="/unlock" element={<UnlockPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
