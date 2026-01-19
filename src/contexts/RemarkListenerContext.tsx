/**
 * Contexto global para el RemarkListener
 * Esto asegura que solo haya UNA instancia del listener en toda la aplicación
 * y que persista entre cambios de ruta
 */

import { createContext, useContext, ReactNode } from 'react'
import { useRemarkListener } from '@/hooks/useRemarkListener'

interface RemarkListenerContextType {
  isListening: boolean
  receivedCount: number
  events: ReturnType<typeof useRemarkListener>['events']
  currentBlockNumber: number | null
  lastProcessedBlock: number | null
  blocksProcessedCount: number
  isManuallyEnabled: boolean
  startListener: () => Promise<void>
  stopListener: () => void
}

const RemarkListenerContext = createContext<RemarkListenerContextType | undefined>(undefined)

export function RemarkListenerProvider({ children }: { children: ReactNode }) {
  const listener = useRemarkListener()

  return (
    <RemarkListenerContext.Provider value={listener}>
      {children}
    </RemarkListenerContext.Provider>
  )
}

export function useRemarkListenerContext() {
  const context = useContext(RemarkListenerContext)
  if (context === undefined) {
    throw new Error('useRemarkListenerContext must be used within RemarkListenerProvider')
  }
  return context
}
