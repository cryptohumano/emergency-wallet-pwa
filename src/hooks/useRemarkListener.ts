/**
 * Hook para escuchar eventos System.Remarked y procesar emergencias
 * FUNCIONA COMO UNA RADIO DE BLOCKCHAIN - SIEMPRE ACTIVA
 * - Se mantiene activo incluso cuando cambias de pestaña
 * - Reconecta automáticamente si se desconecta
 * - Detecta cuando la pestaña vuelve a estar visible
 * - Mantiene la conexión activa con keep-alive
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useNetwork } from '@/contexts/NetworkContext'
import { useActiveAccount } from '@/contexts/ActiveAccountContext'
import { RemarkListener, type BlockchainEvent } from '@/services/blockchain/RemarkListenerPolkadot'
import type { Emergency } from '@/types/emergencies'
import { toast } from 'sonner'

export function useRemarkListener() {
  // TODOS LOS HOOKS DEBEN IR AL INICIO, SIN CONDICIONES
  const { client, selectedChain } = useNetwork()
  const { activeAccount } = useActiveAccount()
  const [isListening, setIsListening] = useState(false)
  const [receivedCount, setReceivedCount] = useState(0)
  const [events, setEvents] = useState<BlockchainEvent[]>([]) // Eventos para el monitor
  const [currentBlockNumber, setCurrentBlockNumber] = useState<number | null>(null)
  const [lastProcessedBlock, setLastProcessedBlock] = useState<number | null>(null)
  const [blocksProcessedCount, setBlocksProcessedCount] = useState(0)
  const [isManuallyEnabled, setIsManuallyEnabled] = useState(true) // Control manual del listener
  const listenerRef = useRef<RemarkListener | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const blockNumberIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isVisibleRef = useRef(true)
  const startListenerRef = useRef<(() => Promise<boolean>) | null>(null)
  const isStartingRef = useRef(false) // Prevenir múltiples inicios simultáneos

  // Callback cuando se recibe una emergencia - SIEMPRE definido
  const handleEmergencyReceived = useCallback(async (emergency: Emergency) => {
    console.log('[useRemarkListener] Emergencia recibida:', emergency.emergencyId)
    setReceivedCount((prev) => prev + 1)

    // Notificar al usuario con toast (siempre visible)
    toast.success('Nueva emergencia recibida', {
      description: `${emergency.type} - ${emergency.severity}`,
      duration: 5000,
    })

    // Si la PWA está instalada y hay permisos, mostrar notificación del navegador
    // Esto funciona incluso cuando la app está en background o cerrada
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification('🚨 Nueva Emergencia Detectada', {
          body: `${emergency.type} - Severidad: ${emergency.severity}`,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `emergency-${emergency.emergencyId}`, // Evitar duplicados
          requireInteraction: emergency.severity === 'critical', // Mantener visible si es crítica
          data: {
            emergencyId: emergency.emergencyId,
            url: `/emergencies/${emergency.emergencyId}`,
          },
        })

        // Al hacer clic en la notificación, abrir la emergencia
        notification.onclick = () => {
          window.focus()
          window.location.href = `/emergencies/${emergency.emergencyId}`
          notification.close()
        }

        // Cerrar automáticamente después de 10 segundos (excepto si es crítica)
        if (emergency.severity !== 'critical') {
          setTimeout(() => notification.close(), 10000)
        }
      } catch (error) {
        console.warn('[useRemarkListener] ⚠️ Error al mostrar notificación:', error)
      }
    } else if ('Notification' in window && Notification.permission === 'default') {
      // Si no se ha solicitado permiso, no hacer nada (el usuario puede solicitarlo manualmente)
      console.log('[useRemarkListener] ℹ️ Permisos de notificación no otorgados')
    }
  }, [])

  // Callback para errores - SIEMPRE definido
  const handleError = useCallback((error: Error) => {
    console.error('[useRemarkListener] Error:', error)
    toast.error('Error al escuchar emergencias', {
      description: error.message,
    })
  }, [])

  // Función para iniciar/reiniciar el listener - usar useRef para evitar problemas de dependencias
  const startListener = useCallback(async () => {
    // Prevenir múltiples inicios simultáneos
    if (isStartingRef.current) {
      return false
    }

    if (!client || !activeAccount) {
      setIsListening(false)
      return false
    }

    // CRÍTICO: Verificar si está manualmente deshabilitado
    if (!isManuallyEnabled) {
      return false
    }

    // Si ya hay un listener activo, no crear otro
    if (listenerRef.current && listenerRef.current.getIsListening()) {
      return true
    }

    // Marcar como iniciando
    isStartingRef.current = true

    // Detener listener anterior si existe (asegurar limpieza completa)
    if (listenerRef.current) {
      try {
        listenerRef.current.stop()
      } catch (error) {
        // Silenciar errores
      }
      listenerRef.current = null
    }

    // Usar instancia singleton para evitar múltiples listeners
    const listener = RemarkListener.getInstance()
    
    // Si ya está escuchando con el mismo endpoint, no reiniciar
    if (listener.getIsListening() && listenerRef.current === listener) {
      console.log('[useRemarkListener] ✅ Listener ya está activo, reutilizando instancia')
      setIsListening(true)
      listenerRef.current = listener
      isStartingRef.current = false
      return true
    }

    // Obtener endpoint de la cadena
    const endpoint = selectedChain?.endpoint
    if (!endpoint) {
      isStartingRef.current = false
      setIsListening(false)
      handleError(new Error('Endpoint de cadena no disponible'))
      return false
    }

    try {
      // La nueva versión usa @polkadot/api y solo necesita el endpoint
      await listener.start(endpoint, activeAccount, {
        onEmergencyReceived: handleEmergencyReceived,
        onEventReceived: (event: BlockchainEvent) => {
          // Agregar evento al estado para el monitor
          setEvents((prev) => {
            // Evitar duplicados por timestamp y tipo
            const isDuplicate = prev.some(
              (e) => e.timestamp === event.timestamp && 
                     e.type === event.type && 
                     e.blockNumber === event.blockNumber &&
                     e.pallet === event.pallet &&
                     e.name === event.name
            )
            if (isDuplicate) {
              return prev
            }
            const newEvents = [event, ...prev]
            // Mantener solo los últimos 50 eventos (reducido de 100 para ahorrar memoria)
            return newEvents.slice(0, 50)
          })
        },
        onBlockProcessed: (blockNumber: number, eventsCount: number) => {
          setCurrentBlockNumber(blockNumber) // Actualizar bloque actual
          setLastProcessedBlock(blockNumber)
          setBlocksProcessedCount((prev) => prev + 1)
        },
        onError: (error) => {
          handleError(error)
          // Si hay error, intentar reconectar después de un delay
          if (isVisibleRef.current && isManuallyEnabled) {
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current)
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              startListenerRef.current?.()
            }, 5000) // Reconectar después de 5 segundos
          }
        },
        chainName: selectedChain?.name || null,
        chainEndpoint: selectedChain?.endpoint || null,
      })

      setIsListening(true)
      listenerRef.current = listener
      isStartingRef.current = false
      return true
    } catch (error) {
      isStartingRef.current = false
      setIsListening(false)
      handleError(error instanceof Error ? error : new Error(String(error)))
      
      // Intentar reconectar después de un delay solo si está habilitado
      if (isVisibleRef.current && isManuallyEnabled) {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          startListenerRef.current?.()
        }, 10000)
      }
      return false
    }
  }, [selectedChain, activeAccount, handleEmergencyReceived, handleError, isManuallyEnabled])

  // Guardar referencia a startListener para usar en otros efectos
  startListenerRef.current = startListener

  // Función para detener el listener manualmente
  const stopListener = useCallback(() => {
    // Marcar como deshabilitado PRIMERO para evitar que useEffect lo reinicie
    setIsManuallyEnabled(false)
    setIsListening(false)
    
    // Limpiar timeouts de reconexión
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Detener listener (esto debe cancelar la suscripción)
    if (listenerRef.current) {
      try {
        listenerRef.current.stop()
      } catch (error) {
        // Silenciar errores
      }
      listenerRef.current = null
    }
    
    // Limpiar keep-alive
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current)
      keepAliveIntervalRef.current = null
    }
  }, [])

  // Función para iniciar el listener manualmente
  const startListenerManually = useCallback(async () => {
    console.log('[useRemarkListener] ▶️ Iniciando listener manualmente...')
    setIsManuallyEnabled(true)
    if (client && activeAccount) {
      await startListener()
    }
  }, [client, activeAccount, startListener])

  // Efecto principal: iniciar listener cuando hay cliente y cuenta Y está habilitado manualmente
  // IMPORTANTE: Este efecto NO debe detener el listener cuando cambia la ruta
  // Solo debe iniciar/detener cuando cambian las dependencias críticas (chain, account, enabled)
  useEffect(() => {
    // Si está deshabilitado manualmente, detener y salir
    if (!isManuallyEnabled) {
      if (listenerRef.current) {
        listenerRef.current.stop()
        listenerRef.current = null
      }
      setIsListening(false)
      return
    }

    // Si no hay endpoint o cuenta, detener y salir
    if (!selectedChain?.endpoint || !activeAccount) {
      if (listenerRef.current) {
        listenerRef.current.stop()
        listenerRef.current = null
      }
      setIsListening(false)
      return
    }

    // Verificar que no haya otro listener activo antes de iniciar
    if (listenerRef.current && listenerRef.current.getIsListening()) {
      // Verificar si el endpoint cambió - si es así, reiniciar
      const currentEndpoint = selectedChain?.endpoint
      if (currentEndpoint && listenerRef.current) {
        // Si el endpoint cambió, necesitamos reiniciar
        // Por ahora, solo verificamos que esté activo
        return // Ya hay un listener activo, no crear otro
      }
      return // Ya hay un listener activo, no crear otro
    }

    // Iniciar listener
    startListener()

    // Cleanup: SOLO detener cuando cambian dependencias críticas (chain, account, enabled)
    // NO detener cuando solo cambia la ruta
    return () => {
      // NO limpiar aquí - el listener debe persistir entre cambios de ruta
      // Solo se detendrá cuando cambien las dependencias críticas arriba
    }
  }, [selectedChain?.endpoint, selectedChain?.name, activeAccount, isManuallyEnabled]) // Solo dependencias críticas, NO startListener

  // El número de bloque se actualiza automáticamente desde onBlockProcessed
  // No necesitamos una suscripción separada

  // Page Visibility API: detectar cuando la pestaña vuelve a estar visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden
      isVisibleRef.current = isVisible

      if (isVisible) {
        console.log('[useRemarkListener] 👁️ Pestaña visible - verificando conexión...')
        // Verificar si el listener está activo
        if (listenerRef.current) {
          const isActive = listenerRef.current.getIsListening()
          if (!isActive) {
            console.log('[useRemarkListener] 🔄 Listener inactivo, reconectando...')
            startListenerRef.current?.()
          } else {
            console.log('[useRemarkListener] ✅ Listener sigue activo')
          }
        } else if (client && activeAccount) {
          console.log('[useRemarkListener] 🔄 No hay listener, iniciando...')
          startListenerRef.current?.()
        }
      } else {
        console.log('[useRemarkListener] 👁️‍🗨️ Pestaña oculta - manteniendo escucha activa en background')
        // El listener sigue activo, solo cambiamos el flag
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [client, activeAccount])

  // Keep-alive: verificar periódicamente que el listener esté activo
  useEffect(() => {
    if (!client || !activeAccount) {
      return
    }

    // Limpieza periódica de eventos para evitar acumulación de memoria
    const cleanupEventsInterval = setInterval(() => {
      setEvents((prev) => {
        // Mantener solo los últimos 50 eventos
        if (prev.length > 50) {
          return prev.slice(0, 50)
        }
        return prev
      })
    }, 60000) // Limpiar cada minuto

    // Verificar cada 30 segundos que el listener esté activo
    keepAliveIntervalRef.current = setInterval(() => {
      if (isVisibleRef.current && client && activeAccount) {
        if (listenerRef.current) {
          const isActive = listenerRef.current.getIsListening()
          if (!isActive) {
            console.log('[useRemarkListener] 🔄 Keep-alive: Listener inactivo, reconectando...')
            startListenerRef.current?.()
          }
        } else {
          console.log('[useRemarkListener] 🔄 Keep-alive: No hay listener, iniciando...')
          startListenerRef.current?.()
        }
      }
    }, 30000) // Verificar cada 30 segundos

    return () => {
      if (keepAliveIntervalRef.current) {
        clearInterval(keepAliveIntervalRef.current)
        keepAliveIntervalRef.current = null
      }
      if (cleanupEventsInterval) {
        clearInterval(cleanupEventsInterval)
      }
    }
  }, [client, activeAccount])

  return {
    isListening,
    receivedCount,
    events, // Eventos para el monitor tipo "radio"
    currentBlockNumber, // Número de bloque actual
    lastProcessedBlock, // Último bloque procesado por el listener
    blocksProcessedCount, // Cantidad de bloques procesados
    isManuallyEnabled, // Si el listener está habilitado manualmente
    startListener: startListenerManually, // Función para iniciar manualmente
    stopListener, // Función para detener manualmente
  }
}
