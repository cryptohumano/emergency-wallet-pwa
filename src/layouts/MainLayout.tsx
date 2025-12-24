import { Outlet } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { useIsMobile } from '@/hooks/use-mobile'
import { useKeyringContext } from '@/contexts/KeyringContext'

export default function MainLayout() {
  const isMobile = useIsMobile()
  const { isUnlocked } = useKeyringContext()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col">
        {isUnlocked && <Header />}
        <div className="flex flex-1 overflow-hidden">
          {!isMobile && isUnlocked && <Sidebar />}
          <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 ${!isMobile && isUnlocked ? 'md:ml-64' : ''} ${isMobile && isUnlocked ? 'pb-20' : ''}`} style={{ scrollBehavior: 'smooth' }}>
            <Outlet />
          </main>
        </div>
        {isMobile && isUnlocked && <BottomNav />}
      </div>
    </AuthGuard>
  )
}

