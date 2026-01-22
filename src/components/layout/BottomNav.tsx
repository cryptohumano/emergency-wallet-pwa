/**
 * BottomNav simplificado para Emergency Wallet
 * Solo emergencias y cuenta activa
 */

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, AlertTriangle, Wallet, Settings, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ActiveAccountSwitcher } from '@/components/ActiveAccountSwitcher'
import { ThemeToggle } from '@/components/ThemeToggle'
import { BalanceDisplay } from '@/components/BalanceDisplay'
import { useRadioMonitor } from '@/contexts/RadioMonitorContext'
import { useI18n } from '@/contexts/I18nContext'

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const { isExpanded } = useRadioMonitor()
  const { t } = useI18n()
  
  const navigation = [
    { name: t('nav.home'), href: '/', icon: Home, description: t('home.title') },
    { name: t('nav.emergencies'), href: '/emergencies', icon: AlertTriangle, description: t('emergencies.title') },
    { name: t('nav.accounts'), href: '/accounts', icon: Wallet, description: t('accounts.title') },
    { name: t('nav.settings'), href: '/settings', icon: Settings, description: t('settings.title') },
  ]

  const handleNavigation = (href: string) => {
    navigate(href)
    setIsOpen(false)
  }

  return (
    <>
      {/* FAB Button - Posicionado a la derecha (navegación) */}
      <div
        className={cn(
          "fixed bottom-4 right-4 md:hidden z-[100] pointer-events-auto fab-navigation fab-dim",
          isExpanded && "fab-dim-active"
        )}
        style={{
          bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
          right: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}
      >
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 bg-primary text-primary-foreground hover:bg-primary/90 border-2 border-primary/20"
              aria-label={t('nav.home')}
            >
              {isOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="bottom-above-fab"
            className="h-[70vh] rounded-t-2xl overflow-y-auto border-t shadow-2xl sheet-solid-bg"
            style={{
              bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 1rem)) + 5rem)', // Encima de los FABs (h-14 = 3.5rem + 1.5rem de espacio)
              paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
            }}
          >
            <SheetHeader>
              <SheetTitle>{t('settings.navigation')}</SheetTitle>
              <SheetDescription>{t('settings.selectOption')}</SheetDescription>
            </SheetHeader>
            {/* Balance - Solo en móvil */}
            <div className="mt-4 mb-4">
              <div className="text-sm font-medium mb-2 px-1">{t('accounts.balance')}</div>
              <div className="p-2 bg-muted rounded-lg">
                <BalanceDisplay showIcon={true} />
              </div>
            </div>
            {/* Selector de cuenta activa - Solo en móvil */}
            <div className="mt-4 mb-4">
              <div className="text-sm font-medium mb-2 px-1">{t('settings.activeAccount')}</div>
              <ActiveAccountSwitcher />
            </div>
            {/* Toggle de tema */}
            <div className="mt-4 mb-4">
              <div className="text-sm font-medium mb-2 px-1">{t('settings.theme')}</div>
              <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">{t('settings.appearance')}</span>
                <ThemeToggle />
              </div>
            </div>
            <div className="mt-6 space-y-2 pb-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Button
                    key={item.name}
                    onClick={() => handleNavigation(item.href)}
                    variant={isActive ? 'default' : 'ghost'}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 h-auto justify-start',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-6 w-6 flex-shrink-0',
                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                      )}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div
                        className={cn(
                          'font-medium',
                          isActive ? 'text-primary-foreground' : 'text-foreground'
                        )}
                      >
                        {item.name}
                      </div>
                      <div
                        className={cn(
                          'text-sm mt-0.5',
                          isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    )}
                  </Button>
                )
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
