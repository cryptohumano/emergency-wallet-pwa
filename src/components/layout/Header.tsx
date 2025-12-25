import { Button } from '@/components/ui/button'
import { Search, Bell, Menu } from 'lucide-react'
import { NetworkSwitcher } from '@/components/NetworkSwitcher'
import { useNetwork } from '@/contexts/NetworkContext'

export function Header() {
  const { selectedChain, setSelectedChain, isConnecting } = useNetwork()

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 safe-area-inset-top">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold truncate">Aura Wallet</h1>
            <div className="hidden sm:block flex-shrink-0">
              <NetworkSwitcher
                selectedChain={selectedChain}
                onSelectChain={setSelectedChain}
                isConnecting={isConnecting}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <div className="sm:hidden">
              <NetworkSwitcher
                selectedChain={selectedChain}
                onSelectChain={setSelectedChain}
                isConnecting={isConnecting}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

