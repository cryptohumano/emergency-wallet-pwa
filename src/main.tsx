// OPTIMIZACIÓN LCP: Polyfills mínimos síncronos, carga completa asíncrona
// Crear un Buffer stub inmediatamente para evitar errores
if (typeof window !== 'undefined' && !window.Buffer) {
  // Stub temporal hasta que se cargue el Buffer real
  ;(window as any).Buffer = class BufferStub {
    static from() { return new Uint8Array() }
    static alloc() { return new Uint8Array() }
    static isBuffer() { return false }
  }
  ;(window as any).buffer = { Buffer: (window as any).Buffer }
}

// Cargar Buffer real de forma asíncrona después del renderizado
import('buffer').then(({ Buffer }) => {
  if (typeof window !== 'undefined') {
    window.Buffer = Buffer
    ;(window as any).buffer = { Buffer }
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.Buffer = Buffer
    ;(globalThis as any).buffer = { Buffer }
  }
}).catch(console.error)

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

import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router'
import { KeyringProvider } from './contexts/KeyringContext'
import { ActiveAccountProvider } from './contexts/ActiveAccountContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { I18nProvider } from './contexts/I18nContext'
import { Toaster } from '@/components/ui/sonner'

// OPTIMIZACIÓN LCP: Lazy load de providers pesados que hacen conexiones WebSocket
// Estos providers se cargan después de que el contenido crítico se haya renderizado
const NetworkProvider = lazy(() => import('@/contexts/NetworkContext').then(m => ({ default: m.NetworkProvider })))
const RadioMonitorProvider = lazy(() => import('@/contexts/RadioMonitorContext').then(m => ({ default: m.RadioMonitorProvider })))
const RemarkListenerProvider = lazy(() => import('@/contexts/RemarkListenerContext').then(m => ({ default: m.RemarkListenerProvider })))

// Componente interno que envuelve los providers lazy de conexiones
function LazyConnectionProviders({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <NetworkProvider>
        <RadioMonitorProvider>
          <RemarkListenerProvider>
            {children}
          </RemarkListenerProvider>
        </RadioMonitorProvider>
      </NetworkProvider>
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <KeyringProvider>
          <ActiveAccountProvider>
            <LazyConnectionProviders>
              <RouterProvider router={router} />
              <Toaster />
            </LazyConnectionProviders>
          </ActiveAccountProvider>
        </KeyringProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>,
)

