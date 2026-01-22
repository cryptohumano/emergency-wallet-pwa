import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Home,
  Wallet,
  Send,
  QrCode,
  History,
  Network,
  Users,
  FileText,
  Plane,
  Heart,
  Award,
  Mountain,
  Settings,
} from 'lucide-react'
import { useI18n } from '@/contexts/I18nContext'

export function Sidebar() {
  const { t } = useI18n()
  const location = useLocation()

  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.accounts'), href: '/accounts', icon: Wallet },
    { name: t('nav.send'), href: '/send', icon: Send },
    { name: t('nav.receive'), href: '/receive', icon: QrCode },
    { name: t('nav.transactions'), href: '/transactions', icon: History },
    { name: t('nav.networks'), href: '/networks', icon: Network },
    { name: t('nav.contacts'), href: '/contacts', icon: Users },
    { name: t('nav.documents'), href: '/documents', icon: FileText },
    { name: t('nav.flightLogs'), href: '/flight-logs', icon: Plane },
    { name: t('nav.mountainLogs'), href: '/mountain-logs', icon: Mountain },
    { name: t('nav.medicalRecords'), href: '/medical-records', icon: Heart },
    { name: t('nav.attestations'), href: '/attestations', icon: Award },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
  ]

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:top-16 border-r bg-background z-30">
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                  )}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

