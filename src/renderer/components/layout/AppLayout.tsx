import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TitleBar from './TitleBar'

export default function AppLayout() {
  return (
    <div className="flex h-screen w-screen flex-col bg-vault-bg overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
