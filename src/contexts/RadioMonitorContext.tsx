/**
 * Contexto para compartir el estado del Radio Monitor
 * Permite que otros componentes (como FABs) reaccionen al estado del monitor
 */

import { createContext, useContext, useState, ReactNode } from 'react'

interface RadioMonitorContextType {
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
}

const RadioMonitorContext = createContext<RadioMonitorContextType | undefined>(undefined)

export function RadioMonitorProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <RadioMonitorContext.Provider value={{ isExpanded, setIsExpanded }}>
      {children}
    </RadioMonitorContext.Provider>
  )
}

export function useRadioMonitor() {
  const context = useContext(RadioMonitorContext)
  if (context === undefined) {
    throw new Error('useRadioMonitor must be used within a RadioMonitorProvider')
  }
  return context
}
