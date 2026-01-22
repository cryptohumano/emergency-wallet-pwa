// Polyfills para Node.js modules en el navegador
// Importar buffer y hacerlo disponible globalmente para que el código del cliente pueda acceder
import { Buffer } from 'buffer'

// Hacer Buffer disponible globalmente para compatibilidad con código que espera buffer.Buffer
if (typeof window !== 'undefined') {
  window.Buffer = Buffer
  // También disponible como buffer.Buffer para compatibilidad
  ;(window as any).buffer = { Buffer }
}

if (typeof globalThis !== 'undefined') {
  globalThis.Buffer = Buffer
  // También disponible como buffer.Buffer para compatibilidad
  ;(globalThis as any).buffer = { Buffer }
}

// Polyfill para crypto.randomUUID si no está disponible
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  crypto.randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }
}

// Verificar que crypto.subtle esté disponible
if (typeof crypto === 'undefined' || !crypto.subtle) {
  console.error('⚠️ crypto.subtle no está disponible. Asegúrate de usar HTTPS o localhost.')
  console.error('La encriptación no funcionará correctamente sin crypto.subtle.')
}

// Manejador global de errores para capturar errores internos de Dedot
// Estos errores no afectan la funcionalidad pero saturan la consola
if (typeof window !== 'undefined') {
  // Función helper para verificar si es un error de Dedot que debemos ignorar
  const isDedotInternalError = (message: string | Event, error?: Error): boolean => {
    const messageStr = typeof message === 'string' ? message : String(message)
    const errorMessage = error?.message || ''
    const errorStack = error?.stack || ''
    
    // Errores relacionados con 'hash' undefined en Dedot
    const isHashError = (
      messageStr.includes('hash') && 
      (messageStr.includes('undefined') || messageStr.includes('Cannot read properties'))
    ) || (
      errorMessage.includes('hash') && 
      (errorMessage.includes('undefined') || errorMessage.includes('Cannot read properties'))
    )
    
    // Errores de conexión WebSocket que son normales durante reconexiones
    const isConnectionError = (
      messageStr.includes('Could not establish connection') ||
      messageStr.includes('Receiving end does not exist') ||
      messageStr.includes('Connection closed') ||
      messageStr.includes('write after end')
    ) || (
      errorMessage.includes('Could not establish connection') ||
      errorMessage.includes('Receiving end does not exist') ||
      errorMessage.includes('Connection closed') ||
      errorMessage.includes('write after end')
    )
    
    // Errores de WsProvider internos
    const isWsProviderError = (
      messageStr.includes('WsProvider') ||
      messageStr.includes('_handleNotification') ||
      messageStr.includes('_onReceiveResponse') ||
      errorStack.includes('WsProvider') ||
      errorStack.includes('_handleNotification') ||
      errorStack.includes('_onReceiveResponse')
    )
    
    // Errores de extensiones del navegador (MetaMask, etc.)
    const isExtensionError = (
      messageStr.includes('Extension context invalidated') ||
      messageStr.includes('Extension') ||
      errorMessage.includes('Extension context invalidated')
    )
    
    return isHashError || isConnectionError || isWsProviderError || isExtensionError
  }
  
  // Manejador de errores síncronos
  const originalErrorHandler = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (isDedotInternalError(message, error)) {
      // Solo loguear en modo debug para no saturar la consola
      if (process.env.NODE_ENV === 'development') {
        console.debug('[GlobalErrorHandler] ⚠️ Error interno ignorado:', message)
      }
      return true // Prevenir que el error se propague
    }
    // Llamar al manejador original para otros errores
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error)
    }
    return false
  }
  
  // Manejador de promesas rechazadas (errores asíncronos)
  const originalRejectionHandler = window.onunhandledrejection
  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason
    const error = reason instanceof Error ? reason : new Error(String(reason))
    const message = error.message || String(reason)
    
    if (isDedotInternalError(message, error)) {
      // Solo loguear en modo debug para no saturar la consola
      if (process.env.NODE_ENV === 'development') {
        console.debug('[GlobalErrorHandler] ⚠️ Promesa rechazada ignorada:', message)
      }
      event.preventDefault() // Prevenir que el error se propague
      return
    }
    
    // Llamar al manejador original para otros errores
    if (originalRejectionHandler) {
      originalRejectionHandler(event)
    }
  }
  
  console.log('[GlobalErrorHandler] ✅ Manejador global de errores configurado')
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { KeyringProvider } from './contexts/KeyringContext'
import { NetworkProvider } from './contexts/NetworkContext'
import { ActiveAccountProvider } from './contexts/ActiveAccountContext'
import { RemarkListenerProvider } from './contexts/RemarkListenerContext'
import { RadioMonitorProvider } from './contexts/RadioMonitorContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './contexts/I18nContext'
import { Toaster } from '@/components/ui/sonner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <KeyringProvider>
          <ActiveAccountProvider>
            <NetworkProvider>
              <RadioMonitorProvider>
                <RemarkListenerProvider>
                  <RouterProvider router={router} />
                  <Toaster />
                </RemarkListenerProvider>
              </RadioMonitorProvider>
            </NetworkProvider>
          </ActiveAccountProvider>
        </KeyringProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)

