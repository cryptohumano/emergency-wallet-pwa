/**
 * Servicio para escuchar eventos System.Remarked y procesar emergencias
 * Implementa la estrategia eficiente de escuchar solo eventos System.Remarked
 */

import { DedotClient } from 'dedot'
import type { Emergency, EmergencyRemarkData } from '@/types/emergencies'
import { parseEmergencyFromRemark } from '@/types/emergencies'
import { createEmergencyLocal } from '@/services/emergencies/EmergencyService'
import { saveEmergency } from '@/utils/emergencyStorage'

export interface BlockchainEvent {
  type: 'System.Remarked' | 'System.ExtrinsicSuccess' | 'System.ExtrinsicFailed' | 'Balances.Transfer' | 'other'
  pallet: string
  name: string
  blockNumber?: number
  blockHash?: string
  accountId?: string
  timestamp: number
  data?: any
}

export interface RemarkListenerCallbacks {
  onEmergencyReceived?: (emergency: Emergency) => void
  onError?: (error: Error) => void
  onEventReceived?: (event: BlockchainEvent) => void // Nuevo: callback para todos los eventos
  onBlockProcessed?: (blockNumber: number, eventsCount: number) => void // Callback cuando se procesa un bloque
  chainName?: string | null
  chainEndpoint?: string | null
  // Opción de debugging: escuchar remarks de todas las cuentas (no solo la activa)
  debugMode?: boolean // Si es true, procesa emergencias de todas las cuentas
}

export class RemarkListener {
  private client: DedotClient | null = null
  private activeAccount: string | null = null
  private unsubscribe: (() => void) | null = null
  private callbacks: RemarkListenerCallbacks = {}
  private isListening = false
  private startTime: number = 0
  private blocksProcessed: number = 0
  private remarksFound: number = 0
  private lastEventTime: number = 0
  private connectionCheckInterval: NodeJS.Timeout | null = null
  private allEvents: BlockchainEvent[] = [] // Historial de eventos (últimos 50)
  private maxEventsHistory = 50 // Reducido de 100 a 50 para ahorrar memoria
  private memoryCleanupInterval: NodeJS.Timeout | null = null
  private globalErrorHandler: ((event: ErrorEvent) => void) | null = null
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null

  /**
   * Inicia la escucha de eventos System.Remarked
   * 
   * ESTRATEGIA:
   * 1. Escucha TODOS los eventos System.Remarked (de cualquier cuenta)
   * 2. Filtra por patrón EMERGENCY: (sin importar la cuenta)
   * 3. Parsea los datos de emergencia
   * 4. Filtra por cuenta activa (solo procesa emergencias de la cuenta activa, a menos que esté en modo debug)
   * 
   * Esto es eficiente porque:
   * - Solo procesa bloques que tienen remarks
   * - Solo procesa remarks que tienen el patrón EMERGENCY:
   * - Solo guarda emergencias de la cuenta activa (en modo normal)
   */
  async start(
    client: DedotClient,
    accountAddress: string,
    callbacks?: RemarkListenerCallbacks
  ): Promise<void> {
    if (this.isListening) {
      console.warn('[RemarkListener] Ya está escuchando, deteniendo primero...')
      this.stop()
    }

    this.client = client
    this.activeAccount = accountAddress
    this.callbacks = callbacks || {}

    // Instalar manejador global de errores para capturar errores internos de dedot
    this.globalErrorHandler = (event: ErrorEvent) => {
      const error = event.error || event.message || ''
      const errorString = String(error)
      const stack = error instanceof Error ? (error.stack || '') : ''
      
      // Detectar errores de dedot relacionados con 'hash' undefined
      const isDedotHashError = (
        (errorString.includes('hash') && 
         (errorString.includes('undefined') || errorString.includes('Cannot read properties'))) ||
        (stack && stack.includes('hash') && 
         (stack.includes('undefined') || stack.includes('Cannot read properties'))) ||
        (stack && stack.includes('#onFollowEvent') && 
         (errorString.includes('hash') || errorString.includes('undefined')))
      )
      
      // Detectar errores de WsProvider internos
      const isWsProviderError = (
        (stack && stack.includes('WsProvider')) ||
        (stack && stack.includes('_handleNotification')) ||
        (stack && stack.includes('_onReceiveResponse')) ||
        (stack && stack.includes('onNewMessage')) ||
        (stack && stack.includes('dedot.js'))
      )
      
      // Si es un error interno de dedot que debemos ignorar, prevenir su propagación
      if (isDedotHashError || (isWsProviderError && errorString.includes('hash'))) {
        event.preventDefault() // Prevenir que el error se muestre en la consola
        event.stopPropagation()
        // Solo loguear en modo debug
        if (process.env.NODE_ENV === 'development') {
          console.debug('[RemarkListener] ⚠️ Error interno de Dedot interceptado y silenciado:', errorString.substring(0, 100))
        }
        return false
      }
    }
    
    // Instalar manejador para promesas rechazadas no capturadas
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const error = event.reason || ''
      const errorString = String(error)
      const stack = error instanceof Error ? (error.stack || '') : ''
      const stackStr = stack || ''
      
      // Detectar errores de dedot relacionados con 'hash' undefined
      const isDedotHashError = (
        (errorString.includes('hash') && 
         (errorString.includes('undefined') || errorString.includes('Cannot read properties'))) ||
        (stackStr.includes('hash') && 
         (stackStr.includes('undefined') || stackStr.includes('Cannot read properties'))) ||
        (stackStr.includes('#onFollowEvent') && 
         (errorString.includes('hash') || errorString.includes('undefined')))
      )
      
      // Detectar errores de WsProvider internos
      const isWsProviderError = (
        stackStr.includes('WsProvider') ||
        stackStr.includes('_handleNotification') ||
        stackStr.includes('_onReceiveResponse') ||
        stackStr.includes('onNewMessage') ||
        stackStr.includes('dedot.js')
      )
      
      // Si es un error interno de dedot que debemos ignorar, prevenir su propagación
      if (isDedotHashError || (isWsProviderError && errorString.includes('hash'))) {
        event.preventDefault() // Prevenir que el error se muestre en la consola
        // Solo loguear en modo debug
        if (process.env.NODE_ENV === 'development') {
          console.debug('[RemarkListener] ⚠️ Promesa rechazada de Dedot interceptada y silenciada:', errorString.substring(0, 100))
        }
        return false
      }
    }
    
    // Registrar manejadores globales
    if (typeof window !== 'undefined' && this.globalErrorHandler && this.unhandledRejectionHandler) {
      window.addEventListener('error', this.globalErrorHandler, true)
      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler, true)
    }

    try {
      // Esperar un momento para asegurar que el cliente esté completamente conectado
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Verificar que el cliente esté conectado
      const clientProvider = (client as any).provider
      if (!clientProvider) {
        const error = new Error('Provider no disponible - el cliente no está conectado')
        console.error('[RemarkListener] ❌', error.message)
        this.callbacks.onError?.(error)
        throw error
      }

      // Verificar que la API de eventos esté disponible
      if (!(client as any).query?.system?.events) {
        const error = new Error('API de eventos no disponible en el cliente')
        console.error('[RemarkListener] ❌', error.message)
        this.callbacks.onError?.(error)
        throw error
      }

      const chainName = callbacks?.chainName || 'desconocida'
      const chainEndpoint = callbacks?.chainEndpoint || (client as any).provider?.endpoint || 'desconocida'

      console.log('[RemarkListener] 🔍 Iniciando suscripción a eventos System.Remarked...')
      console.log('[RemarkListener] 📋 Cuenta activa:', accountAddress)
      console.log('[RemarkListener] 🌐 Red:', chainName)
      console.log('[RemarkListener] 🔗 Endpoint:', chainEndpoint)

      // Suscribirse a eventos del sistema
      // ESTRATEGIA EFICIENTE: Escuchar solo eventos System.Remarked
      console.log('[RemarkListener] 🔍 Verificando API de eventos...')
      console.log('[RemarkListener] 📋 query.system:', !!client.query?.system)
      console.log('[RemarkListener] 📋 query.system.events:', typeof (client as any).query?.system?.events)
      
      // Verificar si existe la API client.events (método recomendado por dedot)
      const hasEventsAPI = !!(client as any)?.events
      const hasSystemRemarkedAPI = !!(client as any)?.events?.system?.Remarked
      const hasWatchAPI = !!(client as any)?.events?.system?.Remarked?.watch
      const hasFilterAPI = !!(client as any)?.events?.system?.Remarked?.filter
      
      console.log('[RemarkListener] 📋 client.events disponible:', hasEventsAPI)
      console.log('[RemarkListener] 📋 client.events.system.Remarked disponible:', hasSystemRemarkedAPI)
      console.log('[RemarkListener] 📋 client.events.system.Remarked.watch disponible:', hasWatchAPI)
      console.log('[RemarkListener] 📋 client.events.system.Remarked.filter disponible:', hasFilterAPI)
      
      if (hasEventsAPI) {
        console.log('[RemarkListener] 📋 Estructura de client.events:', {
          tieneSystem: !!(client as any).events.system,
          keys: Object.keys((client as any).events || {}),
          systemKeys: (client as any).events?.system ? Object.keys((client as any).events.system) : 'no system',
        })
      }
      
      // ESTRATEGIA: Usar query.system.events() con wrapper que capture errores de dedot
      // El error "Cannot destructure property 'hash' of 'undefined'" viene de dentro de dedot
      // cuando intenta procesar eventos. Lo manejamos con un wrapper robusto.
      console.log('[RemarkListener] 🔄 Suscribiéndose a eventos usando query.system.events()...')
      
      // Wrapper seguro que captura TODOS los errores, incluso los de dedot
      const safeHandleEvents = async (eventRecords: any[]) => {
        try {
          // Validar que eventRecords sea válido antes de procesar
          if (!eventRecords || !Array.isArray(eventRecords)) {
            console.debug('[RemarkListener] ⚠️ eventRecords no válido, ignorando')
            return
          }
          
          await this.handleEvents(eventRecords)
        } catch (error) {
          // Función helper para verificar si es un error de Dedot que debemos ignorar silenciosamente
          const isDedotInternalError = (err: unknown): boolean => {
            if (!(err instanceof Error)) return false
            
            const message = err.message || ''
            const stack = err.stack || ''
            
            // Errores relacionados con 'hash' undefined en Dedot
            const isHashError = (
              message.includes('hash') && 
              (message.includes('undefined') || message.includes('Cannot read properties'))
            ) || (
              stack.includes('hash') && 
              (stack.includes('undefined') || stack.includes('Cannot read properties'))
            )
            
            // Errores de conexión WebSocket que son normales durante reconexiones
            const isConnectionError = (
              message.includes('Could not establish connection') ||
              message.includes('Receiving end does not exist') ||
              message.includes('Connection closed') ||
              message.includes('write after end')
            )
            
            // Errores de WsProvider internos
            const isWsProviderError = (
              message.includes('WsProvider') ||
              message.includes('_handleNotification') ||
              message.includes('_onReceiveResponse') ||
              stack.includes('WsProvider') ||
              stack.includes('_handleNotification') ||
              stack.includes('_onReceiveResponse')
            )
            
            return isHashError || isConnectionError || isWsProviderError
          }
          
          // Si es un error interno de Dedot, ignorarlo silenciosamente
          if (isDedotInternalError(error)) {
            // Solo loguear en modo debug para no saturar la consola
            if (process.env.NODE_ENV === 'development') {
              console.debug('[RemarkListener] ⚠️ Error interno de Dedot ignorado (continuando escucha):', error)
            }
            return // Salir silenciosamente sin notificar
          }
          
          // Para otros errores, loguear y notificar
          console.warn('[RemarkListener] ⚠️ Error en handleEvents (capturado, continuando escucha):', error)
          
          // Notificar el error pero no lanzarlo para mantener la suscripción activa
          if (this.callbacks.onError) {
            try {
              this.callbacks.onError(error instanceof Error ? error : new Error(String(error)))
            } catch (callbackError) {
              console.warn('[RemarkListener] ⚠️ Error al notificar callback:', callbackError)
            }
          }
        }
      }
      
      // Intentar crear la suscripción con manejo de errores robusto
      let subscriptionAttempts = 0
      const maxAttempts = 3
      
      while (subscriptionAttempts < maxAttempts) {
        try {
          subscriptionAttempts++
          console.log(`[RemarkListener] 🔄 Intento ${subscriptionAttempts}/${maxAttempts} de suscripción...`)
          
          this.unsubscribe = await (client as any).query.system.events(safeHandleEvents)
          
          if (this.unsubscribe) {
            console.log('[RemarkListener] ✅ Suscripción creada exitosamente')
            break
          }
        } catch (subscribeError: any) {
          console.warn(`[RemarkListener] ⚠️ Intento ${subscriptionAttempts} falló:`, subscribeError?.message || subscribeError)
          
          if (subscriptionAttempts >= maxAttempts) {
            // Si todos los intentos fallaron, usar polling como fallback
            console.log('[RemarkListener] 🔄 Todos los intentos fallaron, usando polling como fallback...')
            
            let lastBlockNumber: number | null = null
            const pollingInterval = setInterval(async () => {
              try {
                const currentBlock = await (client as any).query.system.number()
                const blockNum = Number(currentBlock)
                
                if (lastBlockNumber === null || blockNum > lastBlockNumber) {
                  const events = await (client as any).query.system.events()
                  if (events && Array.isArray(events)) {
                    await safeHandleEvents(events)
                  }
                  lastBlockNumber = blockNum
                }
              } catch (error) {
                console.warn('[RemarkListener] ⚠️ Error en polling:', error)
              }
            }, 6000) // Polling cada 6 segundos
            
            this.unsubscribe = () => {
              clearInterval(pollingInterval)
            }
            
            console.log('[RemarkListener] ✅ Polling iniciado como fallback')
            break
          }
          
          // Esperar antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 2000 * subscriptionAttempts))
        }
      }

      if (!this.unsubscribe) {
        const error = new Error('No se pudo obtener función de desuscripción')
        console.error('[RemarkListener] ❌', error.message)
        this.callbacks.onError?.(error)
        throw error
      }

      this.isListening = true
      this.startTime = Date.now()
      this.lastEventTime = Date.now()
      this.blocksProcessed = 0
      this.remarksFound = 0
      
      // Iniciar verificación periódica de conexión
      this.startConnectionCheck()
      
      // Iniciar limpieza periódica de memoria
      this.startMemoryCleanup()
      
      console.log('[RemarkListener] ✅ Escucha iniciada correctamente para cuenta:', accountAddress)
      console.log('[RemarkListener] 🎧 Escuchando eventos System.Remarked constantemente...')
      console.log('[RemarkListener] ⏱️ Tiempo de refresh: En tiempo real (cada nuevo bloque)')
      console.log('[RemarkListener] 📊 Estadísticas: Se mostrarán cada 50 bloques')
      console.log('[RemarkListener] 🔄 Verificación de conexión: Cada 60 segundos')
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al iniciar escucha:', error)
      this.isListening = false
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Inicia verificación periódica de conexión
   * Verifica que sigamos recibiendo eventos (si no, puede haber desconexión)
   */
  private startConnectionCheck(): void {
    // Limpiar intervalo anterior si existe
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
    }

    // Verificar cada 60 segundos si seguimos recibiendo eventos
    this.connectionCheckInterval = setInterval(() => {
      const timeSinceLastEvent = Date.now() - this.lastEventTime
      const maxSilenceTime = 120000 // 2 minutos sin eventos = posible desconexión

      if (timeSinceLastEvent > maxSilenceTime && this.isListening) {
        console.warn('[RemarkListener] ⚠️ No se han recibido eventos en', Math.floor(timeSinceLastEvent / 1000), 'segundos')
        console.warn('[RemarkListener] ⚠️ Posible desconexión - el listener puede necesitar reiniciarse')
        // No detenemos automáticamente, solo advertimos
        // El keep-alive del hook se encargará de reconectar si es necesario
      } else {
        console.debug('[RemarkListener] ✅ Conexión activa (último evento hace', Math.floor(timeSinceLastEvent / 1000), 'segundos)')
      }
    }, 60000) // Verificar cada 60 segundos
  }

  /**
   * Inicia limpieza periódica de memoria
   * Limpia eventos antiguos y reduce el uso de memoria
   */
  private startMemoryCleanup(): void {
    // Limpiar intervalo anterior si existe
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval)
    }

    // Limpiar memoria cada 5 minutos
    this.memoryCleanupInterval = setInterval(() => {
      if (!this.isListening) {
        return
      }

      try {
        // Limpiar eventos antiguos (mantener solo los últimos N)
        if (this.allEvents.length > this.maxEventsHistory) {
          const before = this.allEvents.length
          this.allEvents = this.allEvents.slice(0, this.maxEventsHistory)
          console.log(`[RemarkListener] 🧹 Limpieza de memoria: ${before} -> ${this.allEvents.length} eventos`)
        }

        // Forzar garbage collection si está disponible (solo en desarrollo)
        if (process.env.NODE_ENV === 'development' && (globalThis as any).gc) {
          (globalThis as any).gc()
        }
      } catch (error) {
        console.warn('[RemarkListener] ⚠️ Error en limpieza de memoria:', error)
      }
    }, 300000) // Cada 5 minutos
  }

  /**
   * Maneja los eventos recibidos de la blockchain
   * IMPORTANTE: Escuchamos TODOS los eventos System.Remarked (de cualquier cuenta)
   * Luego filtramos por patrón EMERGENCY: y finalmente por cuenta activa
   */
  private async handleEvents(eventRecords: any[]): Promise<void> {
    // CRÍTICO: Verificar si el listener está activo antes de procesar
    if (!this.isListening) {
      return // Salir inmediatamente si el servicio está detenido
    }
    
    // Wrapper try-catch para capturar errores de dedot
    try {
      // Actualizar tiempo del último evento recibido
      this.lastEventTime = Date.now()
      
      // Validar que eventRecords sea válido
      if (!eventRecords || !Array.isArray(eventRecords)) {
        return
      }
      
      // Obtener número de bloque actual
      let blockNumber: number | null = null
      try {
        if (this.client) {
          blockNumber = await (this.client as any).query.system.number()
        }
      } catch (error) {
        console.warn('[RemarkListener] ⚠️ No se pudo obtener número de bloque:', error)
      }
      
      // Reducir logs - solo mostrar cada 50 bloques o si hay eventos importantes
      const shouldLog = this.blocksProcessed % 50 === 0
      
      try {
      if (!eventRecords || eventRecords.length === 0) {
        // No hay eventos en este bloque, esto es normal
        this.blocksProcessed++
        // Notificar bloque procesado incluso si no tiene eventos
        if (blockNumber !== null && this.callbacks.onBlockProcessed) {
          try {
            this.callbacks.onBlockProcessed(blockNumber, 0)
          } catch (error) {
            // Silenciar errores de callback
          }
        }
        return
      }
      
      // Solo loguear bloques con eventos cada 10 bloques o si hay remarks
      if (shouldLog) {
        console.log(`[RemarkListener] 📦 Bloque #${blockNumber || '?'} - ${eventRecords.length} evento(s)`)
      }

      // Log de debugging: mostrar información del bloque y eventos
      const blockInfo = eventRecords[0]?.blockHash ? {
        blockHash: eventRecords[0].blockHash,
        blockNumber: eventRecords[0].blockNumber,
      } : null

      // Analizar tipos de eventos recibidos y notificar todos los eventos
      const eventTypes = eventRecords.map((record: any) => {
        const event = record?.event
        if (!event) {
          console.warn('[RemarkListener] ⚠️ Evento sin estructura válida:', record)
          return 'unknown'
        }
        
        // Crear objeto de evento para el monitor
        const blockchainEvent: BlockchainEvent = {
          type: event.pallet === 'System' && event.name === 'Remarked' 
            ? 'System.Remarked'
            : event.pallet === 'System' && event.name === 'ExtrinsicSuccess'
            ? 'System.ExtrinsicSuccess'
            : event.pallet === 'System' && event.name === 'ExtrinsicFailed'
            ? 'System.ExtrinsicFailed'
            : event.pallet === 'Balances' && event.name === 'Transfer'
            ? 'Balances.Transfer'
            : 'other',
          pallet: event.pallet,
          name: event.name,
          blockNumber: blockInfo?.blockNumber,
          blockHash: blockInfo?.blockHash,
          accountId: event.data?.[0]?.toString() || undefined,
          timestamp: Date.now(),
          data: event.data,
        }
        
        // Agregar al historial (mantener solo los últimos N)
        // Usar unshift para agregar al inicio, pero limitar inmediatamente
        this.allEvents.unshift(blockchainEvent)
        // Limitar más agresivamente para ahorrar memoria
        if (this.allEvents.length > this.maxEventsHistory) {
          this.allEvents = this.allEvents.slice(0, this.maxEventsHistory)
        }
        
        // Notificar evento al callback
        this.callbacks.onEventReceived?.(blockchainEvent)
        
        return `${event.pallet}.${event.name}`
      })
      
      const eventTypesCount = eventTypes.reduce((acc: Record<string, number>, type: string) => {
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})

      // Logs de debug eliminados para reducir verbosidad

      // Actualizar estadísticas
      this.blocksProcessed++
      
      // Notificar que se procesó un bloque (antes de buscar remarks)
      if (blockNumber !== null && this.callbacks.onBlockProcessed) {
        try {
          this.callbacks.onBlockProcessed(blockNumber, eventRecords.length)
        } catch (error) {
          console.warn('[RemarkListener] ⚠️ Error al notificar onBlockProcessed:', error)
        }
      }

      // ESTRATEGIA: Buscar eventos System.Remarked (emitidos por system.remarkWithEvent)
      // También buscar extrinsics system.remarkWithEvent y system.remark como fallback
      //
      // ACLARACIÓN IMPORTANTE:
      // - EVENTO: System.Remarked (el evento que se emite cuando usas remarkWithEvent)
      // - EXTRINSIC/MÉTODO: system.remark o system.remarkWithEvent (el método que llamas)
      // - El pallet es "System" (con mayúscula)
      // - El método es "remark" o "remarkWithEvent" (NO "Remarked")
      
      // 1. PRIMERO: Buscar eventos System.Remarked (el EVENTO, no el método)
      // Este evento se emite cuando se ejecuta system.remarkWithEvent
      const remarkEvents = eventRecords.filter((record: any) => {
        const event = record?.event
        if (!event) return false
        
        // En dedot, la estructura puede ser: event.palletEvent.name o event.name
        // Buscamos el EVENTO "Remarked" del pallet "System"
        const isSystem = event?.pallet === 'System' || event?.section === 'System' || event?.section === 'system'
        
        if (!isSystem) return false
        
        // Verificar estructura palletEvent (estructura de dedot)
        const palletEventName = event?.palletEvent?.name
        const eventName = event?.name
        
        // Buscar "Remarked" en cualquiera de las estructuras posibles
        const isRemarked = 
          palletEventName === 'Remarked' || 
          palletEventName === 'remark' ||
          eventName === 'Remarked' ||
          eventName === 'remark'
        
        if (isRemarked && shouldLog) {
          console.log(`[RemarkListener] ✅ System.Remarked encontrado en bloque #${blockNumber}`)
        }
        return isRemarked
      })
      
          // 2. Si encontramos eventos System.Remarked, procesarlos directamente
          if (remarkEvents.length > 0) {
            console.log(`[RemarkListener] ✅ ${remarkEvents.length} System.Remarked encontrado(s) en bloque #${blockNumber}`)
            
            for (let i = 0; i < remarkEvents.length; i++) {
              const eventRecord = remarkEvents[i]
              try {
                await this.processRemarkEvent(eventRecord, blockNumber)
              } catch (error) {
                console.error(`[RemarkListener] ❌ Error al procesar remark:`, error)
                this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
              }
            }
            
            this.remarksFound += remarkEvents.length
          }
      
      // 3. FALLBACK: Si no hay eventos System.Remarked, buscar extrinsics system.remarkWithEvent o system.remark
      // Buscamos los MÉTODOS "remark" o "remarkWithEvent" del pallet "System" (NO el evento "Remarked")
      // Detectar si hay eventos System.ExtrinsicSuccess (indica que hay extrinsics exitosas)
      const extrinsicSuccessEvents = eventRecords.filter((record: any) => {
        const event = record?.event
        return (event?.pallet === 'System' || event?.section === 'System') && 
               (event?.name === 'ExtrinsicSuccess' || event?.method === 'ExtrinsicSuccess')
      })
      
      if (extrinsicSuccessEvents.length > 0) {
        console.log(`[RemarkListener] 🔍 BLOQUE #${blockNumber || '?'} - ${extrinsicSuccessEvents.length} ExtrinsicSuccess encontrado(s)`)
        
        // 2. Obtener el hash del bloque usando el número de bloque
        let blockHash: string | null = null
        if (blockNumber !== null && this.client) {
          try {
            blockHash = await (this.client as any).query.system.blockHash(blockNumber)
            console.log(`[RemarkListener] ✅ Hash del bloque obtenido:`, blockHash?.substring(0, 20) + '...')
          } catch (error) {
            console.warn('[RemarkListener] ⚠️ Error al obtener hash del bloque:', error)
          }
        }
        
        // 3. Obtener el bloque completo para buscar extrinsics system.remark
        if (blockHash) {
          try {
            console.log(`[RemarkListener] 🔍 Obteniendo bloque #${blockNumber || '?'} (hash: ${blockHash.substring(0, 20)}...) para buscar extrinsics system.remark...`)
            
            // Usar provider.send para obtener el bloque (como en BlockExplorer.tsx)
            const provider = (this.client as any).provider
            if (!provider || typeof provider.send !== 'function') {
              console.warn('[RemarkListener] ⚠️ Provider no disponible o sin método send')
              return
            }
            
            const block = await provider.send('chain_getBlock', [blockHash])
            
            if (block && block.block && block.block.extrinsics) {
              console.log(`[RemarkListener] ✅ Bloque obtenido, ${block.block.extrinsics.length} extrinsics encontradas`)
              
              // 4. Buscar extrinsics con método system.remarkWithEvent o system.remark
              const remarkExtrinsics: Array<{ extrinsic: any, index: number }> = []
              
              for (let i = 0; i < block.block.extrinsics.length; i++) {
                const extrinsic = block.block.extrinsics[i]
                if (extrinsic && extrinsic.method) {
                  const pallet = extrinsic.method.pallet || extrinsic.method.section
                  const method = extrinsic.method.method || extrinsic.method.name
                  
                  // Buscar system.remarkWithEvent (preferido) o system.remark
                  if ((pallet === 'System' || pallet === 'system') && 
                      (method === 'remarkWithEvent' || method === 'RemarkWithEvent' || 
                       method === 'remark' || method === 'Remark')) {
                    remarkExtrinsics.push({ extrinsic, index: i })
                    console.log(`[RemarkListener] ✅✅✅ EXTRINSIC system.${method} ENCONTRADA en índice ${i}`)
                  }
                }
              }
              
              // 5. Procesar cada remark encontrado (solo si no encontramos eventos System.Remarked)
              if (remarkExtrinsics.length > 0 && remarkEvents.length === 0) {
                console.log(`[RemarkListener] ✅✅✅ ${remarkExtrinsics.length} extrinsics system.remark/system.remarkWithEvent encontradas en bloque #${blockNumber || '?'}`)
                
                for (const { extrinsic, index } of remarkExtrinsics) {
                  try {
                    await this.processRemarkExtrinsic(extrinsic, blockHash, index, blockNumber)
                  } catch (error) {
                    console.error('[RemarkListener] ❌ Error al procesar remark extrinsic:', error)
                    this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
                  }
                }
                
                this.remarksFound += remarkExtrinsics.length
              } else if (remarkExtrinsics.length > 0) {
                console.log(`[RemarkListener] ⏭️ Extrinsics encontradas pero ya procesamos eventos System.Remarked`)
              } else {
                console.log(`[RemarkListener] ⏭️ No hay extrinsics system.remark/system.remarkWithEvent en bloque #${blockNumber || '?'}`)
              }
            }
          } catch (error) {
            console.error('[RemarkListener] ❌ Error al obtener bloque:', error)
            this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
          }
        } else {
          console.warn(`[RemarkListener] ⚠️ No se pudo obtener hash del bloque #${blockNumber || '?'}`)
        }
      } else if (remarkEvents.length === 0) {
        // Log ocasional para verificar que estamos recibiendo eventos pero sin ExtrinsicSuccess ni Remarked
        if (this.blocksProcessed % 50 === 0) {
          console.log(`[RemarkListener] ⏭️ BLOQUE #${blockNumber || '?'} - No hay eventos System.Remarked ni System.ExtrinsicSuccess`)
        }
      }

      // Log cada bloque con información detallada (solo cada 10 bloques o si hay remarks)
      if (this.blocksProcessed % 10 === 0 || remarkEvents.length > 0) {
        const uptime = Math.floor((Date.now() - this.startTime) / 1000)
        console.log(`[RemarkListener] 📦 Bloque #${this.blocksProcessed} recibido:`, {
          totalEventos: eventRecords.length,
          tiposDeEventos: eventTypesCount,
          blockHash: blockInfo?.blockHash?.substring(0, 16) + '...',
          blockNumber: blockInfo?.blockNumber,
          uptime: `${uptime}s`,
          remarksEncontrados: this.remarksFound,
          remarksEnEsteBloque: remarkEvents.length,
        })
      }

      // Solo procesar si hay remarks (la mayoría de bloques no tienen)
      if (remarkEvents.length === 0) {
        // Log solo ocasionalmente para no saturar
        if (Math.random() < 0.05) {
          console.log('[RemarkListener] ⏭️ No hay eventos System.Remarked en este bloque')
        }
        return // No hacer nada, muy eficiente
      }

      this.remarksFound += remarkEvents.length
      
      console.log(`[RemarkListener] 📨 ${remarkEvents.length} evento(s) System.Remarked encontrado(s) (de cualquier cuenta)`)
      console.log('[RemarkListener] 🔍 Procesando remarks y buscando patrón EMERGENCY:...')
      console.log('[RemarkListener] 📋 Cuenta activa esperada:', this.activeAccount)
      console.log('[RemarkListener] 📊 Total remarks encontrados hasta ahora:', this.remarksFound)

      // Para cada remark, obtener el contenido del bloque
      for (const eventRecord of remarkEvents) {
        try {
          await this.processRemarkEvent(eventRecord, blockNumber)
        } catch (error) {
          console.error('[RemarkListener] ❌ Error al procesar remark individual:', error)
          this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
        }
      }
    } catch (error) {
        console.error('[RemarkListener] ❌ Error al procesar eventos:', error)
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
      }
    } catch (error) {
      // Función helper para verificar si es un error de Dedot que debemos ignorar silenciosamente
      const isDedotInternalError = (err: unknown): boolean => {
        if (!(err instanceof Error)) return false
        
        const message = err.message || ''
        const stack = err.stack || ''
        
        // Errores relacionados con 'hash' undefined en Dedot
        const isHashError = (
          message.includes('hash') && 
          (message.includes('undefined') || message.includes('Cannot read properties'))
        ) || (
          stack.includes('hash') && 
          (stack.includes('undefined') || stack.includes('Cannot read properties'))
        )
        
        // Errores de conexión WebSocket que son normales durante reconexiones
        const isConnectionError = (
          message.includes('Could not establish connection') ||
          message.includes('Receiving end does not exist') ||
          message.includes('Connection closed') ||
          message.includes('write after end')
        )
        
        return isHashError || isConnectionError
      }
      
      // Si es un error interno de Dedot, ignorarlo silenciosamente
      if (isDedotInternalError(error)) {
        // Solo loguear en modo debug para no saturar la consola
        if (process.env.NODE_ENV === 'development') {
          console.debug('[RemarkListener] ⚠️ Error interno de Dedot ignorado:', error)
        }
        return // Salir silenciosamente
      }
      
      // Para otros errores, loguear normalmente
      console.error('[RemarkListener] ❌ Error crítico en handleEvents:', error)
      // No llamar onError aquí para evitar loops infinitos, solo loguear
      // El listener debe continuar funcionando
    }
  }

  /**
   * Procesa un evento System.Remarked individual
   * IMPORTANTE: Este método procesa remarks de CUALQUIER cuenta
   * El filtrado por cuenta activa se hace DESPUÉS de verificar el patrón EMERGENCY:
   */
  /**
   * Procesa una extrinsic system.remark directamente
   */
  private async processRemarkExtrinsic(
    extrinsic: any,
    blockHash: string,
    extrinsicIndex: number,
    blockNumber: number | null
  ): Promise<void> {
    try {
      console.log(`[RemarkListener] 🔍 Procesando extrinsic system.remark en bloque #${blockNumber || '?'}, índice ${extrinsicIndex}`)
      
      if (!extrinsic || !extrinsic.method) {
        console.warn('[RemarkListener] ⚠️ Extrinsic no válida o sin método')
        return
      }

      // Verificar que es system.remark o system.remarkWithEvent
      const pallet = extrinsic.method.pallet || extrinsic.method.section
      const method = extrinsic.method.method || extrinsic.method.name
      
      // El pallet es "System" y el método es "remark" o "remarkWithEvent" (NO "Remarked")
      const isValidRemark = (pallet === 'System' || pallet === 'system') && 
                            (method === 'remark' || method === 'Remark' || 
                             method === 'remarkWithEvent' || method === 'RemarkWithEvent')
      
      if (!isValidRemark) {
        console.warn('[RemarkListener] ⚠️ Extrinsic no es system.remark ni system.remarkWithEvent:', { pallet, method })
        return
      }

      console.log(`[RemarkListener] ✅ Extrinsic system.${method} confirmada`)

      // Extraer contenido del remark
      let remarkContent: string
      const rawContent = extrinsic.method.args?.[0]
      
      if (!rawContent) {
        console.warn('[RemarkListener] ⚠️ Contenido del remark vacío')
        return
      }

      // Convertir a string según el tipo
      if (typeof rawContent === 'string') {
        if (rawContent.startsWith('0x')) {
          const hexString = rawContent.slice(2)
          try {
            remarkContent = Buffer.from(hexString, 'hex').toString('utf-8')
          } catch (e) {
            remarkContent = rawContent
          }
        } else {
          remarkContent = rawContent
        }
      } else if (rawContent instanceof Uint8Array) {
        remarkContent = new TextDecoder().decode(rawContent)
      } else if (typeof rawContent === 'object' && rawContent !== null) {
        if ('toHex' in rawContent && typeof rawContent.toHex === 'function') {
          const hex = rawContent.toHex()
          remarkContent = Buffer.from(hex.slice(2), 'hex').toString('utf-8')
        } else if ('toString' in rawContent && typeof rawContent.toString === 'function') {
          remarkContent = rawContent.toString()
        } else {
          remarkContent = String(rawContent)
        }
      } else {
        remarkContent = String(rawContent)
      }

      console.log('[RemarkListener] 📝 Contenido del remark extraído:', remarkContent.substring(0, 100) + '...')

      // Parsear si es emergencia
      const emergencyData = parseEmergencyFromRemark(remarkContent)
      if (!emergencyData) {
        console.log('[RemarkListener] ⏭️ Remark no contiene datos de emergencia (no tiene patrón EMERGENCY:)')
        return
      }

      console.log('[RemarkListener] ✅ Datos de emergencia parseados:', {
        emergencyId: emergencyData.emergencyId,
        type: emergencyData.type,
        reporterAccount: emergencyData.reporterAccount,
      })

      // Procesar emergencias de CUALQUIER cuenta (no filtrar por cuenta activa)
      // Esto permite que los rescatistas vean todas las emergencias en la blockchain
      console.log('[RemarkListener] ✅ Procesando emergencia de cualquier cuenta (radio de blockchain)')

      // Crear emergencia local
      const emergency = createEmergencyLocal(
        {
          type: emergencyData.type,
          description: emergencyData.description,
          severity: emergencyData.severity,
          location: emergencyData.location,
          relatedLogId: emergencyData.relatedLogId,
          relatedMilestoneId: emergencyData.relatedMilestoneId,
          metadata: emergencyData.metadata,
        },
        emergencyData.reporterAccount
      )
      
      // Actualizar con información de blockchain
      emergency.blockchainTxHash = blockHash
      emergency.blockchainBlockNumber = blockNumber || undefined
      emergency.blockchainExtrinsicIndex = extrinsicIndex
      emergency.status = 'submitted'
      emergency.submittedAt = emergencyData.reportedAt
      emergency.synced = true

      // Guardar en IndexedDB
      await saveEmergency(emergency)

      console.log('[RemarkListener] ✅✅✅ EMERGENCIA PROCESADA Y GUARDADA:', {
        emergencyId: emergency.emergencyId,
        blockNumber: blockNumber || 'desconocido',
        extrinsicIndex,
      })

      // Notificar al callback
      this.callbacks.onEmergencyReceived?.(emergency)
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al procesar remark extrinsic:', error)
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  private async processRemarkEvent(eventRecord: any, blockNumber: number | null = null): Promise<void> {
    console.log('[RemarkListener] 🚀 INICIANDO processRemarkEvent para bloque #' + (blockNumber || '?'))
    
    if (!this.client || !this.activeAccount) {
      console.warn('[RemarkListener] ⚠️ Cliente o cuenta activa no disponible', {
        tieneClient: !!this.client,
        tieneActiveAccount: !!this.activeAccount,
        activeAccount: this.activeAccount,
      })
      return
    }

    try {
      const event = eventRecord?.event
      if (!event) {
        console.warn('[RemarkListener] ⚠️ Evento no válido en eventRecord')
        return
      }
      
      console.log('[RemarkListener] ✅ Evento válido encontrado, procesando...')

      // Según la documentación de Polkadot.js:
      // https://polkadot.js.org/docs/asset-hub-kusama/events#remarkedaccountid32-h256
      // El evento System.Remarked tiene la estructura: Remarked(AccountId32, H256)
      // Es decir, data es un array [AccountId32, H256]
      const remarkData = event.palletEvent?.data
      if (!remarkData) {
        console.warn('[RemarkListener] ⚠️ Datos de evento incompletos (no hay palletEvent.data)')
        console.log('[RemarkListener] 🔍 event.palletEvent:', event.palletEvent)
        return
      }

      // Manejar tanto array [AccountId32, H256] como objeto {sender, hash}
      let accountId: any
      let remarkHash: string | undefined

      if (Array.isArray(remarkData)) {
        // Estructura estándar: [AccountId32, H256]
        accountId = remarkData[0]
        remarkHash = remarkData[1]
        console.log('[RemarkListener] 🔍 remarkData es array:', { accountId, remarkHash })
      } else if (typeof remarkData === 'object' && remarkData !== null) {
        // Estructura alternativa: {sender, hash}
        accountId = remarkData.sender
        remarkHash = remarkData.hash
        console.log('[RemarkListener] 🔍 remarkData es objeto:', { accountId, remarkHash })
      } else {
        console.warn('[RemarkListener] ⚠️ remarkData tiene formato inesperado:', typeof remarkData, remarkData)
        return
      }

      if (!accountId || !remarkHash) {
        console.warn('[RemarkListener] ⚠️ Datos de evento incompletos (accountId o hash faltante)')
        console.log('[RemarkListener] 🔍 remarkData:', remarkData)
        console.log('[RemarkListener] 🔍 accountId:', accountId)
        console.log('[RemarkListener] 🔍 remarkHash:', remarkHash)
        return
      }

      // Convertir accountId a string si es necesario (para logging)
      // En dedot, AccountId32 puede venir como objeto con método toSS58() o propiedad raw
      let accountIdStr: string = ''
      try {
        if (typeof accountId === 'string') {
          accountIdStr = accountId
        } else if (accountId && typeof (accountId as any).toSS58 === 'function') {
          accountIdStr = (accountId as any).toSS58()
        } else if (accountId && typeof (accountId as any).toHuman === 'function') {
          const human = (accountId as any).toHuman()
          accountIdStr = typeof human === 'string' ? human : String(accountId)
        } else if (accountId && typeof accountId.toString === 'function') {
          const str = accountId.toString()
          accountIdStr = str !== '[object Object]' ? str : String(accountId)
        } else {
          accountIdStr = String(accountId)
        }
      } catch (error) {
        accountIdStr = String(accountId)
      }
      
      // Log para debugging (reducido)
      if (this.blocksProcessed % 50 === 0) {
        console.log('[RemarkListener] 🔍 Remark de cuenta:', accountIdStr.substring(0, 12) + '...')
      }

      // Obtener el hash del bloque usando el número de bloque
      // Usar provider.send como en BlockExplorer.tsx
      const provider = (this.client as any).provider
      if (!provider || typeof provider.send !== 'function') {
        console.warn('[RemarkListener] ⚠️ Provider no disponible o sin método send')
        return
      }

      let blockHash: string | null = null
      if (blockNumber !== null) {
        try {
          console.log(`[RemarkListener] 🔍 Obteniendo hash del bloque #${blockNumber}...`)
          blockHash = await provider.send('chain_getBlockHash', [Number(blockNumber)])
          console.log(`[RemarkListener] ✅ Hash del bloque obtenido:`, blockHash?.substring(0, 20) + '...')
        } catch (error) {
          console.warn('[RemarkListener] ⚠️ Error al obtener hash del bloque:', error)
          // Intentar usar el hash del evento si está disponible
          blockHash = eventRecord.blockHash || null
        }
      } else {
        blockHash = eventRecord.blockHash || null
      }

      if (!blockHash) {
        console.warn('[RemarkListener] ⚠️ No se pudo obtener blockHash')
        return
      }

      // El extrinsicIndex viene del phase.value del record
      const extrinsicIndex = eventRecord.phase?.value

      console.log('[RemarkListener] 🔍 Obteniendo bloque completo:', blockHash.substring(0, 20) + '...')
      console.log('[RemarkListener] 🔍 Extrinsic index:', extrinsicIndex)
      
      const block = await provider.send('chain_getBlock', [blockHash])
      
      // Log detallado de la estructura del bloque
      console.log('[RemarkListener] 🔍 Estructura del bloque recibido:', {
        tieneBlock: !!block,
        tieneBlockBlock: !!block?.block,
        blockKeys: block ? Object.keys(block) : [],
        blockBlockKeys: block?.block ? Object.keys(block.block) : [],
        tieneExtrinsics: !!block?.block?.extrinsics,
        cantidadExtrinsics: block?.block?.extrinsics?.length || 0,
        tieneExtrinsicsDirecto: !!block?.extrinsics,
        cantidadExtrinsicsDirecto: block?.extrinsics?.length || 0,
      })
      
      // El bloque puede tener extrinsics en block.block.extrinsics o block.extrinsics
      const extrinsics = block?.block?.extrinsics || block?.extrinsics
      
      if (!block || !extrinsics || extrinsics.length === 0) {
        console.warn('[RemarkListener] ⚠️ Bloque no válido o sin extrinsics')
        console.log('[RemarkListener] 🔍 Block completo:', JSON.stringify(block, null, 2).substring(0, 500))
        return
      }
      
      console.log('[RemarkListener] ✅ Bloque obtenido, extrinsics:', extrinsics.length)

      const extrinsic = extrinsics[extrinsicIndex]
      if (!extrinsic) {
        return
      }

      // La extrinsic puede venir como bytes codificados o como objeto decodificado
      // Intentar decodificar si es necesario
      let decodedExtrinsic = extrinsic
      if (typeof extrinsic === 'string' || extrinsic instanceof Uint8Array) {
        // Es bytes codificados, necesitamos decodificarla
        try {
          // Usar el cliente para decodificar
          if (this.client && (this.client as any).tx) {
            decodedExtrinsic = await (this.client as any).tx.decodeExtrinsic(extrinsic)
          } else {
            // Si no se puede decodificar, intentar acceder directamente
            decodedExtrinsic = extrinsic
          }
        } catch (error) {
          // Si falla la decodificación, intentar acceder directamente
          decodedExtrinsic = extrinsic
        }
      }

      // Buscar el método en diferentes estructuras posibles
      const methodInfo = decodedExtrinsic?.method || 
                        decodedExtrinsic?.call?.method || 
                        decodedExtrinsic?.call ||
                        decodedExtrinsic

      if (!methodInfo) {
        return
      }

      // Extraer pallet y method
      const pallet = methodInfo.pallet || methodInfo.section || methodInfo.module
      const method = methodInfo.method || methodInfo.name || methodInfo.callIndex

      if (!pallet || !method) {
        return
      }

      // Verificar que es system.remark
      if (
        (pallet === 'System' || pallet === 'system') &&
        (method === 'remark' || method === 'Remark')
      ) {
        console.log('[RemarkListener] ✅ Extrinsic System.remark confirmada')

        // Extraer contenido del remark
        // El contenido puede venir en diferentes formatos según la cadena:
        // - string (texto plano)
        // - Uint8Array (bytes)
        // - Hex string (0x...)
        // - Objeto con método toHex()
        let remarkContent: string
        
        const rawContent = methodInfo.args?.[0] || 
                          methodInfo.data?.args?.[0] ||
                          decodedExtrinsic?.args?.[0]
        if (!rawContent) {
          console.warn('[RemarkListener] ⚠️ Contenido del remark vacío')
          console.log('[RemarkListener] 🔍 Extrinsic completa:', JSON.stringify(extrinsic, null, 2))
          return
        }

        console.log('[RemarkListener] 🔍 Raw content tipo:', typeof rawContent)
        console.log('[RemarkListener] 🔍 Raw content:', rawContent)
        console.log('[RemarkListener] 🔍 Raw content constructor:', rawContent?.constructor?.name)
        console.log('[RemarkListener] 🔍 Es Uint8Array?', rawContent instanceof Uint8Array)
        console.log('[RemarkListener] 🔍 Tiene toHex?', typeof (rawContent as any)?.toHex === 'function')
        console.log('[RemarkListener] 🔍 Tiene toString?', typeof (rawContent as any)?.toString === 'function')

        // Convertir a string según el tipo
        if (typeof rawContent === 'string') {
          // Si es string, verificar si es hex
          if (rawContent.startsWith('0x')) {
            // Es un hex string, convertir a texto
            const hexString = rawContent.slice(2) // Remover 0x
            try {
              remarkContent = Buffer.from(hexString, 'hex').toString('utf-8')
              console.log('[RemarkListener] ✅ Convertido desde hex string')
            } catch (e) {
              // Si falla, usar el string directamente
              remarkContent = rawContent
              console.log('[RemarkListener] ⚠️ Error al convertir hex, usando string directo')
            }
          } else {
            remarkContent = rawContent
          }
        } else if (rawContent instanceof Uint8Array) {
          // Convertir bytes a string
          remarkContent = new TextDecoder().decode(rawContent)
          console.log('[RemarkListener] ✅ Convertido desde Uint8Array')
        } else if (typeof rawContent === 'object' && rawContent !== null) {
          // Si es un objeto, puede tener método toHex() o toString()
          if ('toHex' in rawContent && typeof rawContent.toHex === 'function') {
            const hex = rawContent.toHex()
            console.log('[RemarkListener] 🔍 Hex obtenido:', hex.substring(0, 100) + '...')
            // Convertir hex a string (remover 0x si existe y convertir)
            const hexString = hex.startsWith('0x') ? hex.slice(2) : hex
            try {
              remarkContent = Buffer.from(hexString, 'hex').toString('utf-8')
              console.log('[RemarkListener] ✅ Convertido desde objeto.toHex()')
            } catch (e) {
              console.error('[RemarkListener] ❌ Error al convertir hex desde toHex():', e)
              // Fallback: usar toString
              remarkContent = rawContent.toString()
            }
          } else if ('toString' in rawContent && typeof rawContent.toString === 'function') {
            remarkContent = rawContent.toString()
            console.log('[RemarkListener] ✅ Convertido desde objeto.toString()')
          } else {
            // Fallback: convertir a string
            remarkContent = String(rawContent)
            console.log('[RemarkListener] ⚠️ Usando String() como fallback')
          }
        } else {
          // Fallback: convertir a string
          remarkContent = String(rawContent)
          console.log('[RemarkListener] ⚠️ Usando String() como fallback final')
        }

        if (!remarkContent || remarkContent.trim() === '') {
          console.warn('[RemarkListener] ⚠️ Contenido del remark inválido o vacío después de conversión')
          return
        }

        console.log('[RemarkListener] 📝 Contenido completo del remark:', remarkContent)
        console.log('[RemarkListener] 📏 Longitud del remark:', remarkContent.length, 'caracteres')
        console.log('[RemarkListener] 🔍 Tipo original del contenido:', typeof rawContent)
        
        // PRIMERO: Verificar si tiene el patrón EMERGENCY: (sin importar la cuenta)
        const hasEmergencyPattern = remarkContent.startsWith('EMERGENCY:')
        console.log('[RemarkListener] 🔍 ¿Tiene patrón EMERGENCY:?', hasEmergencyPattern)
        
        if (!hasEmergencyPattern) {
          console.log('[RemarkListener] ⏭️ Remark ignorado: No tiene patrón EMERGENCY:')
          console.log('[RemarkListener] 📝 Primeros 100 caracteres:', remarkContent.substring(0, 100))
          return // No es una emergencia, ignorar
        }

        // SEGUNDO: Parsear si es emergencia (ya verificamos el patrón)
        console.log('[RemarkListener] 🚨 Patrón EMERGENCY: detectado, parseando...')
        const emergencyData = parseEmergencyFromRemark(remarkContent)
        
        if (!emergencyData) {
          console.log('[RemarkListener] ❌ Error al parsear emergencia (tiene patrón pero parseo falló)')
          console.log('[RemarkListener] 📝 Contenido completo:', remarkContent)
          return
        }

        console.log('[RemarkListener] ✅ Emergencia parseada correctamente:', {
              emergencyId: emergencyData.emergencyId,
              type: emergencyData.type,
              severity: emergencyData.severity,
          reporterAccount: emergencyData.reporterAccount,
        })
        
        console.log('[RemarkListener] 🔍 Información de la emergencia:')
        console.log('  - reporterAccount (del remark):', emergencyData.reporterAccount)
        console.log('  - activeAccount (cuenta actual):', this.activeAccount)
        console.log('  - ¿Es de la cuenta activa?', emergencyData.reporterAccount === this.activeAccount)

        // Procesar emergencias de CUALQUIER cuenta (no filtrar por cuenta activa)
        // Esto permite que los rescatistas vean todas las emergencias en la blockchain
        console.log('[RemarkListener] ✅ Procesando emergencia de cualquier cuenta (radio de blockchain):', {
          emergencyId: emergencyData.emergencyId,
          type: emergencyData.type,
          severity: emergencyData.severity,
          reporterAccount: emergencyData.reporterAccount,
        })

        // Procesar emergencia con información del bloque
        await this.processEmergency(emergencyData, blockHash, extrinsicIndex, blockNumber)
          } else {
        console.debug('[RemarkListener] 🔍 Extrinsic no es System.remark:', {
          pallet: extrinsic.method.pallet,
          method: extrinsic.method.method,
        })
      }
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al procesar remark:', error)
      throw error
    }
  }

  /**
   * Procesa una emergencia recibida desde blockchain
   */
  private async processEmergency(
    remarkData: EmergencyRemarkData,
    blockHash?: string | null,
    extrinsicIndex?: number | null,
    blockNumber?: number | null
  ): Promise<void> {
    try {
      console.log('[RemarkListener] 🚨 Procesando emergencia desde blockchain:', {
        emergencyId: remarkData.emergencyId,
        type: remarkData.type,
        severity: remarkData.severity,
        blockNumber: blockNumber || 'desconocido',
        blockHash: blockHash?.substring(0, 20) + '...' || 'desconocido',
        extrinsicIndex: extrinsicIndex ?? 'desconocido',
      })

      // Crear Emergency desde los datos del remark
      const emergency = createEmergencyLocal(
        {
          type: remarkData.type,
          severity: remarkData.severity,
          description: remarkData.description,
          location: {
            latitude: remarkData.location.latitude,
            longitude: remarkData.location.longitude,
            altitude: remarkData.location.altitude,
            accuracy: remarkData.location.accuracy,
            timestamp: remarkData.location.timestamp,
          },
          relatedLogId: remarkData.relatedLogId,
          relatedMilestoneId: remarkData.relatedMilestoneId,
          metadata: remarkData.metadata,
        },
        remarkData.reporterAccount
      )

      // Actualizar con datos del blockchain
      emergency.status = 'submitted'
      emergency.submittedAt = remarkData.reportedAt
      emergency.synced = true
      emergency.remarkData = remarkData
      emergency.blockchainTxHash = blockHash || undefined
      emergency.blockchainBlockNumber = blockNumber || undefined
      emergency.blockchainExtrinsicIndex = extrinsicIndex ?? undefined

      console.log('[RemarkListener] 💾 Guardando emergencia en IndexedDB...')

      // Guardar en IndexedDB
      await saveEmergency(emergency)

      console.log('[RemarkListener] ✅ Emergencia guardada exitosamente:', emergency.emergencyId)
      console.log('[RemarkListener] 📢 Notificando al usuario...')

      // Notificar al usuario
      this.callbacks.onEmergencyReceived?.(emergency)

      console.log('[RemarkListener] ✅ Proceso completo - Emergencia recibida y procesada')
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al procesar emergencia:', error)
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * Detiene la escucha
   */
  stop(): void {
    // Marcar como detenido PRIMERO para evitar que handleEvents procese más eventos
    this.isListening = false
    
    // Eliminar manejadores globales de errores
    if (typeof window !== 'undefined') {
      if (this.globalErrorHandler) {
        window.removeEventListener('error', this.globalErrorHandler, true)
        this.globalErrorHandler = null
      }
      if (this.unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler, true)
        this.unhandledRejectionHandler = null
      }
    }
    
    // Limpiar intervalo de verificación de conexión
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }

    // Limpiar intervalo de limpieza de memoria
    if (this.memoryCleanupInterval) {
      clearInterval(this.memoryCleanupInterval)
      this.memoryCleanupInterval = null
    }

    // Cancelar suscripción
    if (this.unsubscribe) {
      try {
      this.unsubscribe()
      } catch (error) {
        // Silenciar errores al cancelar suscripción
      }
      this.unsubscribe = null
    }
    
    // Limpiar referencias
    this.client = null
    this.activeAccount = null
    this.lastEventTime = 0
    this.blocksProcessed = 0
    this.remarksFound = 0
    
    // Limpiar eventos para liberar memoria
    this.allEvents = []
  }

  /**
   * Verifica si está escuchando
   */
  getIsListening(): boolean {
    return this.isListening
  }

  /**
   * Obtiene el historial de eventos (últimos N eventos)
   */
  getEventsHistory(): BlockchainEvent[] {
    return [...this.allEvents]
  }

  /**
   * Limpia el historial de eventos
   */
  clearEventsHistory(): void {
    this.allEvents = []
  }
}
