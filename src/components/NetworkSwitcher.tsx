import { useState } from 'react'
import { DEFAULT_CHAINS, type ChainInfo } from '@/hooks/useDedotClient'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

interface NetworkSwitcherProps {
  selectedChain: ChainInfo | null
  onSelectChain: (chain: ChainInfo) => void
  isConnecting: boolean
}

export function NetworkSwitcher({ selectedChain, onSelectChain, isConnecting }: NetworkSwitcherProps) {
  return (
    <div className="flex items-center gap-2">
      {isConnecting ? (
        <div className="relative">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'hsl(var(--status-connecting))' }} />
          <div className="absolute inset-0 rounded-full animate-ping" style={{ 
            backgroundColor: 'hsl(var(--status-connecting) / 0.3)',
            animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
          }} />
        </div>
      ) : selectedChain ? (
        <div className="relative">
          <Wifi className="h-4 w-4 status-connected" style={{ color: 'hsl(var(--status-connected))' }} />
          <div className="absolute inset-0 rounded-full status-indicator" style={{ 
            backgroundColor: 'hsl(var(--status-connected) / 0.2)'
          }} />
        </div>
      ) : (
        <WifiOff className="h-4 w-4" style={{ color: 'hsl(var(--status-disconnected))' }} />
      )}
      <Select
        value={selectedChain?.endpoint || ''}
        onValueChange={(endpoint) => {
          const chain = DEFAULT_CHAINS.find(c => c.endpoint === endpoint)
          if (chain) {
            onSelectChain(chain)
          }
        }}
        disabled={isConnecting}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Seleccionar red">
            {selectedChain ? selectedChain.name : 'Seleccionar red'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {DEFAULT_CHAINS.map((chain) => (
            <SelectItem key={chain.endpoint} value={chain.endpoint}>
              <div className="flex items-center justify-between w-full">
                <span>{chain.name}</span>
                {selectedChain?.endpoint === chain.endpoint && (
                  <Badge variant="secondary" className="ml-2">Activa</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

