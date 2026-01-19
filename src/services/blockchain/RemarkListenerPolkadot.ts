/**
 * Servicio para escuchar eventos System.Remarked usando @polkadot/api
 * Esta versión usa @polkadot/api solo para el listening, que es más estable
 * para suscripciones a eventos, mientras que el resto de la app usa dedot
 */

import { ApiPromise, WsProvider } from '@polkadot/api'
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
  onEventReceived?: (event: BlockchainEvent) => void
  onBlockProcessed?: (blockNumber: number, eventsCount: number) => void
  onError?: (error: Error) => void
  chainName?: string | null
  chainEndpoint?: string | null
  debugMode?: boolean
}

// Singleton global para evitar múltiples instancias
let globalListenerInstance: RemarkListener | null = null

export class RemarkListener {
  private api: ApiPromise | null = null
  private provider: WsProvider | null = null
  private unsubscribe: (() => void) | null = null
  private isListening: boolean = false
  private activeAccount: string | null = null
  private callbacks: RemarkListenerCallbacks = {}
  private blocksProcessed: number = 0
  private remarksFound: number = 0
  private lastEventTime: number = 0
  private connectionCheckInterval: NodeJS.Timeout | null = null
  private allEvents: BlockchainEvent[] = []
  private maxEventsHistory: number = 100
  private processedEvents: Set<string> = new Set() // Track de eventos ya procesados para evitar duplicados

  /**
   * Obtiene la instancia singleton del listener
   */
  public static getInstance(): RemarkListener {
    if (!globalListenerInstance) {
      globalListenerInstance = new RemarkListener()
    }
    return globalListenerInstance
  }

  /**
   * Resetea la instancia singleton (útil para testing)
   */
  public static resetInstance(): void {
    if (globalListenerInstance) {
      globalListenerInstance.stop()
      globalListenerInstance = null
    }
  }

  /**
   * Inicia la escucha de eventos System.Remarked
   */
  public async start(
    endpoint: string,
    activeAccount: string | null,
    callbacks: RemarkListenerCallbacks
  ): Promise<void> {
    // Si ya está escuchando con el mismo endpoint y cuenta, no reiniciar
    if (this.isListening && this.activeAccount === activeAccount) {
      const currentEndpoint = this.provider?.endpoint || ''
      if (currentEndpoint === endpoint) {
        console.log('[RemarkListener] ✅ Ya está escuchando con el mismo endpoint y cuenta, reutilizando conexión')
        // Actualizar callbacks por si cambiaron
        this.callbacks = callbacks
        return
      }
    }
    
    if (this.isListening) {
      console.log('[RemarkListener] ⚠️ Ya está escuchando con diferente endpoint/cuenta, deteniendo antes de reiniciar...')
      this.stop()
    }

    this.activeAccount = activeAccount
    this.callbacks = callbacks
    this.isListening = true
    this.blocksProcessed = 0
    this.remarksFound = 0
    this.lastEventTime = Date.now()
    this.allEvents = []
    this.processedEvents.clear() // Limpiar eventos procesados al reiniciar

    try {
      // Crear provider y API usando @polkadot/api
      console.log('[RemarkListener] 🔗 Conectando a:', endpoint)
      this.provider = new WsProvider(endpoint)
      this.api = await ApiPromise.create({ provider: this.provider })

      console.log('[RemarkListener] ✅ Conectado a blockchain')
      console.log('[RemarkListener] 📋 Cuenta activa:', activeAccount || 'cualquiera (radio)')
      console.log('[RemarkListener] 🌐 Red:', callbacks.chainName || 'desconocida')

      // Suscribirse a nuevos bloques
      await this.subscribeToBlocks()

      // Iniciar verificación de conexión
      this.startConnectionCheck()

      console.log('[RemarkListener] ✅ Escucha iniciada correctamente')
      console.log('[RemarkListener] 🎧 Escuchando eventos System.Remarked constantemente...')
    } catch (error) {
      this.isListening = false
      console.error('[RemarkListener] ❌ Error al iniciar escucha:', error)
      throw error
    }
  }

  /**
   * Suscribe a nuevos bloques y procesa eventos
   */
  private async subscribeToBlocks(): Promise<void> {
    if (!this.api || !this.isListening) {
      return
    }

    try {
      // Suscribirse a nuevos headers de bloques
      this.unsubscribe = await this.api.rpc.chain.subscribeNewHeads(async (header) => {
        if (!this.isListening || !this.api) {
          return
        }

        try {
          const blockNumber = header.number.toNumber()
          const blockHash = header.hash.toString()

          // Obtener eventos del bloque
          const events = await this.api.query.system.events.at(blockHash)

          // Procesar eventos
          await this.handleEvents(events, blockNumber, blockHash)

          // Notificar bloque procesado
          if (this.callbacks.onBlockProcessed) {
            this.callbacks.onBlockProcessed(blockNumber, events.length)
          }
        } catch (error) {
          console.warn('[RemarkListener] ⚠️ Error al procesar bloque:', error)
          if (this.callbacks.onError) {
            this.callbacks.onError(error instanceof Error ? error : new Error(String(error)))
          }
        }
      })

      console.log('[RemarkListener] ✅ Suscrito a nuevos bloques')
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al suscribirse a bloques:', error)
      throw error
    }
  }

  /**
   * Procesa eventos de un bloque
   */
  private async handleEvents(
    events: any[],
    blockNumber: number,
    blockHash: string
  ): Promise<void> {
    if (!this.isListening) {
      return
    }

    this.lastEventTime = Date.now()
    this.blocksProcessed++

    if (!events || events.length === 0) {
      return
    }

    const shouldLog = this.blocksProcessed % 50 === 0

    if (shouldLog) {
      console.log(`[RemarkListener] 📦 Bloque #${blockNumber} - ${events.length} evento(s)`)
    }

    // Procesar cada evento
    for (const record of events) {
      try {
        const { event } = record

        // Si es System.Remarked, extraer el contenido del remark primero
        let remarkContent: string | null = null
        if (event.section === 'system' && event.method === 'Remarked') {
          console.log('[RemarkListener] 🚨 System.Remarked detectado en bloque #' + blockNumber)
          // Extraer contenido del remark de forma asíncrona
          try {
            remarkContent = await this.extractRemarkContentFromBlock(record, blockHash)
            if (remarkContent) {
              console.log('[RemarkListener] ✅ Contenido del remark extraído:', remarkContent.substring(0, 200))
              console.log('[RemarkListener] 🔍 Prefijo del remark:', remarkContent.substring(0, 20))
              if (remarkContent.startsWith('EMERGENCY:')) {
                console.log('[RemarkListener] ✅ Remark tiene prefijo EMERGENCY: - será procesado')
              } else {
                console.log('[RemarkListener] ⏭️ Remark no tiene prefijo EMERGENCY: - será ignorado')
              }
            } else {
              console.warn('[RemarkListener] ⚠️ No se pudo extraer contenido del remark')
            }
          } catch (error) {
            console.warn('[RemarkListener] ⚠️ Error al extraer contenido del remark:', error)
          }
        }

        // Crear evento para el monitor
        const blockchainEvent: BlockchainEvent = {
          type: this.getEventType(event),
          pallet: event.section,
          name: event.method,
          blockNumber,
          blockHash, // Asegurar que blockHash esté presente
          accountId: this.extractAccountId(event),
          timestamp: Date.now(),
          data: {
            ...event.data,
            // Guardar información adicional para búsqueda
            blockHash,
            blockNumber,
            remarkContent: remarkContent || undefined, // Guardar el contenido real del remark
          },
        }

        // Agregar al historial
        this.allEvents.unshift(blockchainEvent)
        if (this.allEvents.length > this.maxEventsHistory) {
          this.allEvents = this.allEvents.slice(0, this.maxEventsHistory)
        }

        // Notificar evento
        if (this.callbacks.onEventReceived) {
          this.callbacks.onEventReceived(blockchainEvent)
        }

        // Si es System.Remarked y tiene contenido, procesarlo para guardar la emergencia
        if (event.section === 'system' && event.method === 'Remarked' && remarkContent) {
          // Crear un identificador único para este evento para evitar procesamiento duplicado
          const extrinsicIndex = record.phase.isApplyExtrinsic 
            ? record.phase.asApplyExtrinsic.toNumber() 
            : 'unknown'
          const eventId = `${blockHash}-${blockNumber}-${extrinsicIndex}`
          
          // Verificar si ya procesamos este evento ANTES de procesarlo
          if (this.processedEvents.has(eventId)) {
            console.log('[RemarkListener] ⏭️ Evento ya procesado, omitiendo:', {
              eventId: eventId.substring(0, 50),
              blockNumber,
              extrinsicIndex,
            })
            continue // Continuar con el siguiente evento, no salir de la función
          }
          
          // Marcar como procesado INMEDIATAMENTE para evitar procesamiento paralelo
          this.processedEvents.add(eventId)
          
          // Limpiar eventos antiguos (mantener solo los últimos 500)
          if (this.processedEvents.size > 500) {
            const eventsArray = Array.from(this.processedEvents)
            this.processedEvents = new Set(eventsArray.slice(-250)) // Mantener los últimos 250
          }
          
          console.log('[RemarkListener] 🔄 Procesando evento nuevo:', {
            eventId: eventId.substring(0, 50),
            blockNumber,
            extrinsicIndex,
            totalProcesados: this.processedEvents.size,
            remarkContentPreview: remarkContent.substring(0, 100),
          })
          
          await this.processRemarkEvent(record, blockNumber, blockHash, remarkContent)
        }
      } catch (error) {
        console.warn('[RemarkListener] ⚠️ Error al procesar evento:', error)
      }
    }
  }

  /**
   * Extrae el contenido del remark desde el bloque
   */
  private async extractRemarkContentFromBlock(
    record: any,
    blockHash: string
  ): Promise<string | null> {
    if (!this.api) {
      console.warn('[RemarkListener] ⚠️ API no disponible para extraer contenido')
      return null
    }

    try {
      console.log('[RemarkListener] 🔍 Extrayendo contenido del remark desde bloque:', blockHash.substring(0, 20) + '...')
      
      // Obtener el bloque completo
      const signedBlock = await this.api.rpc.chain.getBlock(blockHash)
      const extrinsics = signedBlock.block.extrinsics

      console.log('[RemarkListener] 🔍 Total extrinsics en bloque:', extrinsics.length)

      // Obtener el índice de la extrinsic desde el phase
      const extrinsicIndex = record.phase.isApplyExtrinsic
        ? record.phase.asApplyExtrinsic.toNumber()
        : null

      console.log('[RemarkListener] 🔍 Extrinsic index:', extrinsicIndex)

      if (extrinsicIndex === null) {
        console.warn('[RemarkListener] ⚠️ No se pudo obtener extrinsic index')
        return null
      }

      if (!extrinsics[extrinsicIndex]) {
        console.warn('[RemarkListener] ⚠️ Extrinsic no encontrada en índice:', extrinsicIndex)
        return null
      }

      const extrinsic = extrinsics[extrinsicIndex]
      console.log('[RemarkListener] ✅ Extrinsic encontrada')

      // En @polkadot/api, extrinsic.method es un Call que ya está decodificado
      const method = extrinsic.method
      
      console.log('[RemarkListener] 🔍 Estructura de extrinsic.method:', {
        hasMethod: !!method,
        methodType: typeof method,
        methodKeys: method ? Object.keys(method) : [],
        section: method?.section,
        method: method?.method,
        argsLength: method?.args?.length || 0,
      })

      // Verificar que es system.remark o system.remarkWithEvent
      const section = method.section
      const methodName = method.method
      
      console.log('[RemarkListener] 🔍 Verificando extrinsic:', {
        section,
        method: methodName,
        isSystemRemark: section === 'system' && (methodName === 'remark' || methodName === 'remarkWithEvent'),
      })

      if (section !== 'system' || (methodName !== 'remark' && methodName !== 'remarkWithEvent')) {
        console.log('[RemarkListener] ⏭️ Extrinsic no es system.remark ni system.remarkWithEvent:', {
          section,
          method: methodName,
        })
        return null
      }

      console.log('[RemarkListener] ✅ Extrinsic confirmada:', {
        section,
        method: methodName,
      })

      // Extraer contenido del remark
      // En @polkadot/api, los argumentos están directamente en method.args
      const remarkArg = method.args && method.args.length > 0 ? method.args[0] : null

      console.log('[RemarkListener] 🔍 Argumento del remark:', {
        hasArg: !!remarkArg,
        type: typeof remarkArg,
        constructor: remarkArg?.constructor?.name,
        hasToHex: typeof remarkArg?.toHex === 'function',
        hasToU8a: typeof remarkArg?.toU8a === 'function',
        hasToString: typeof remarkArg?.toString === 'function',
        isUint8Array: remarkArg instanceof Uint8Array,
        isString: typeof remarkArg === 'string',
        valuePreview: remarkArg ? (typeof remarkArg === 'string' ? remarkArg.substring(0, 100) : 'not string') : 'null',
      })

      if (!remarkArg) {
        console.warn('[RemarkListener] ⚠️ No se encontró argumento del remark en method.args')
        // Intentar acceder de otras formas como fallback
        if (method.toHuman && typeof method.toHuman === 'function') {
          const human = method.toHuman()
          console.log('[RemarkListener] 🔍 Método en formato human:', human)
          if (human && human.args && human.args.length > 0) {
            const humanArg = human.args[0]
            console.log('[RemarkListener] 🔍 Argumento desde toHuman:', humanArg)
            // Si es un objeto con value, usar ese
            if (humanArg && typeof humanArg === 'object' && humanArg.value) {
              return this.extractRemarkContent(humanArg.value)
            } else if (typeof humanArg === 'string') {
              return humanArg
            }
          }
        }
        return null
      }

      const content = this.extractRemarkContent(remarkArg)
      if (content) {
        console.log('[RemarkListener] ✅ Contenido extraído exitosamente:', content.substring(0, 200))
      } else {
        console.warn('[RemarkListener] ⚠️ No se pudo extraer contenido del remark')
        console.log('[RemarkListener] 🔍 Intentando métodos alternativos...')
        // Intentar con toHuman como fallback
        if (method.toHuman && typeof method.toHuman === 'function') {
          const human = method.toHuman()
          if (human && human.args && human.args.length > 0) {
            const humanArg = human.args[0]
            if (typeof humanArg === 'string') {
              console.log('[RemarkListener] ✅ Contenido desde toHuman:', humanArg.substring(0, 200))
              return humanArg
            }
          }
        }
      }
      
      return content
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al extraer contenido del remark:', error)
      return null
    }
  }

  /**
   * Procesa un evento System.Remarked
   */
  private async processRemarkEvent(
    record: any,
    blockNumber: number,
    blockHash: string,
    remarkContent: string
  ): Promise<void> {
    if (!this.isListening || !this.api) {
      return
    }

    try {
      const { event } = record
      const data = event.data

      // En @polkadot/api, System.Remarked tiene [AccountId, Hash]
      const accountId = data[0]
      const remarkHash = data[1]

      if (!accountId || !remarkHash) {
        return
      }

      // Convertir accountId a string
      const accountIdStr = accountId.toString()

      // Obtener el índice de la extrinsic para guardarlo
      const extrinsicIndex = record.phase.isApplyExtrinsic
        ? record.phase.asApplyExtrinsic.toNumber()
        : null

      if (extrinsicIndex === null) {
        console.warn('[RemarkListener] ⚠️ No se pudo obtener extrinsic index del phase')
        return
      }

      console.log('[RemarkListener] 📝 Contenido del remark recibido:', remarkContent.substring(0, 200))
      console.log('[RemarkListener] 📝 Longitud del contenido:', remarkContent.length)

      if (!remarkContent.startsWith('EMERGENCY:')) {
        console.log('[RemarkListener] ⏭️ Remark no tiene prefijo EMERGENCY:, ignorando')
        console.log('[RemarkListener] 🔍 Primeros 50 caracteres:', remarkContent.substring(0, 50))
        return
      }

      // Parsear emergencia
      console.log('[RemarkListener] 🔍 Parseando emergencia desde remark...')
      const emergencyData = parseEmergencyFromRemark(remarkContent)
      if (!emergencyData) {
        console.error('[RemarkListener] ❌ Error al parsear emergencia del remark')
        console.error('[RemarkListener] 🔍 Contenido completo del remark:', remarkContent)
        return
      }

      console.log('[RemarkListener] ✅ Emergencia parseada exitosamente:', {
        emergencyId: emergencyData.emergencyId,
        type: emergencyData.type,
        severity: emergencyData.severity,
        reporterAccount: emergencyData.reporterAccount,
        description: emergencyData.description?.substring(0, 50),
      })

      // Procesar emergencia (guardar en IndexedDB)
      console.log('[RemarkListener] 🚀 Iniciando proceso de guardado en IndexedDB...')
      await this.processEmergency(emergencyData, blockHash, extrinsicIndex, blockNumber)
      console.log('[RemarkListener] ✅ Proceso de guardado completado')
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al procesar remark:', error)
    }
  }

  /**
   * Extrae el contenido del remark de diferentes formatos
   */
  private extractRemarkContent(arg: any): string | null {
    try {
      console.log('[RemarkListener] 🔍 Extrayendo contenido, tipo:', typeof arg, arg?.constructor?.name)

      // Si es string directo
      if (typeof arg === 'string') {
        console.log('[RemarkListener] ✅ Contenido es string directo')
        return arg
      }

      // Si es Uint8Array
      if (arg instanceof Uint8Array) {
        console.log('[RemarkListener] ✅ Contenido es Uint8Array, decodificando...')
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(arg)
        console.log('[RemarkListener] ✅ Decodificado desde Uint8Array:', decoded.substring(0, 100))
        return decoded
      }

      // Si tiene método toU8a (objeto de @polkadot/api) - preferir este método
      if (arg && typeof arg.toU8a === 'function') {
        console.log('[RemarkListener] ✅ Contenido tiene toU8a(), convirtiendo...')
        try {
          const u8a = arg.toU8a()
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(u8a)
          console.log('[RemarkListener] ✅ Decodificado desde U8a:', decoded.substring(0, 200))
          return decoded
        } catch (error) {
          console.error('[RemarkListener] ❌ Error al convertir desde U8a:', error)
        }
      }

      // Si tiene método toHex (objeto de @polkadot/api)
      if (arg && typeof arg.toHex === 'function') {
        console.log('[RemarkListener] ✅ Contenido tiene toHex(), convirtiendo...')
        try {
          const hex = arg.toHex()
          console.log('[RemarkListener] 🔍 Hex obtenido (primeros 100 chars):', hex.substring(0, 100))
          
          // Remover prefijo 0x si existe
          const hexString = hex.startsWith('0x') ? hex.slice(2) : hex
          
          // Convertir hex a bytes y luego a string
          // Usar una función más robusta para convertir hex a bytes
          const bytes = new Uint8Array(hexString.length / 2)
          for (let i = 0; i < hexString.length; i += 2) {
            bytes[i / 2] = parseInt(hexString.substr(i, 2), 16)
          }
          
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
          console.log('[RemarkListener] ✅ Decodificado desde hex:', decoded.substring(0, 200))
          return decoded
        } catch (error) {
          console.error('[RemarkListener] ❌ Error al convertir desde hex:', error)
        }
      }

      // Si tiene método toU8a (objeto de @polkadot/api)
      if (arg && typeof arg.toU8a === 'function') {
        console.log('[RemarkListener] ✅ Contenido tiene toU8a(), convirtiendo...')
        try {
          const u8a = arg.toU8a()
          const decoded = new TextDecoder('utf-8', { fatal: false }).decode(u8a)
          console.log('[RemarkListener] ✅ Decodificado desde U8a:', decoded.substring(0, 200))
          return decoded
        } catch (error) {
          console.error('[RemarkListener] ❌ Error al convertir desde U8a:', error)
        }
      }

      // Si tiene método toString
      if (arg && typeof arg.toString === 'function') {
        console.log('[RemarkListener] ✅ Contenido tiene toString(), usando...')
        const str = arg.toString()
        // Verificar que no sea [object Object]
        if (str !== '[object Object]' && str.length > 0) {
          console.log('[RemarkListener] ✅ toString() válido:', str.substring(0, 100))
          return str
        }
      }

      // Si es un objeto con propiedades, intentar extraer
      if (arg && typeof arg === 'object') {
        console.log('[RemarkListener] 🔍 Contenido es objeto, buscando propiedades...')
        // Intentar acceder a propiedades comunes
        if (arg.value) {
          return this.extractRemarkContent(arg.value)
        }
        if (arg.data) {
          return this.extractRemarkContent(arg.data)
        }
        if (arg.toString && typeof arg.toString === 'function') {
          const str = arg.toString()
          if (str && str !== '[object Object]') {
            return str
          }
        }
      }

      console.warn('[RemarkListener] ⚠️ No se pudo extraer contenido del remark')
      return null
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al extraer contenido:', error)
      return null
    }
  }

  /**
   * Procesa una emergencia recibida
   */
  private async processEmergency(
    remarkData: EmergencyRemarkData,
    blockHash: string,
    extrinsicIndex: number,
    blockNumber: number
  ): Promise<void> {
    try {
      // Verificar duplicados usando función optimizada
      const { getEmergencyByBlockchainRef } = await import('@/utils/emergencyStorage')
      const duplicate = await getEmergencyByBlockchainRef(blockHash, extrinsicIndex, blockNumber)

      if (duplicate) {
        console.log('[RemarkListener] ⏭️ Emergencia ya existe en IndexedDB, omitiendo guardado duplicado:', {
          emergencyId: duplicate.emergencyId,
          blockHash: blockHash.substring(0, 20) + '...',
          blockNumber,
          extrinsicIndex,
        })
        return
      }

      // Verificación adicional: buscar por emergencyId del remarkData (si existe)
      if (remarkData.emergencyId) {
        const { getEmergency } = await import('@/utils/emergencyStorage')
        const duplicateById = await getEmergency(remarkData.emergencyId)
        if (duplicateById) {
          console.log('[RemarkListener] ⏭️ Emergencia ya existe por ID, omitiendo:', {
            emergencyId: remarkData.emergencyId,
            blockNumber,
          })
          return
        }
      }

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

      emergency.blockchainTxHash = blockHash
      emergency.blockchainBlockNumber = blockNumber
      emergency.blockchainExtrinsicIndex = extrinsicIndex
      emergency.status = 'submitted'
      emergency.submittedAt = remarkData.reportedAt
      emergency.synced = true
      emergency.remarkData = remarkData

      console.log('[RemarkListener] 💾 Guardando emergencia en IndexedDB...')
      await saveEmergency(emergency)
      
      // Consultar identidad del reporter en todas las cadenas disponibles (en segundo plano)
      // Esto no bloquea el guardado de la emergencia
      console.log('[RemarkListener] 🔍 Consultando identidad del reporter (en segundo plano):', remarkData.reporterAccount)
      ;(async () => {
        try {
          const { fetchIdentityFromAllChains } = await import('@/utils/identityUtils')
          const { identity, chain } = await fetchIdentityFromAllChains(remarkData.reporterAccount)
          if (identity) {
            console.log('[RemarkListener] ✅ Identidad encontrada en', chain, ':', identity.display)
            // Actualizar emergencia con identidad después de guardarla
            const { getEmergency, saveEmergency: updateEmergency } = await import('@/utils/emergencyStorage')
            const savedEmergency = await getEmergency(emergency.emergencyId)
            if (savedEmergency) {
              if (!savedEmergency.metadata) {
                savedEmergency.metadata = {}
              }
              savedEmergency.metadata.reporterIdentity = identity
              savedEmergency.metadata.reporterIdentityChain = chain
              await updateEmergency(savedEmergency)
              console.log('[RemarkListener] ✅ Identidad actualizada en emergencia guardada')
            }
          } else {
            console.log('[RemarkListener] ⚠️ No se encontró identidad para el reporter')
          }
        } catch (error) {
          console.warn('[RemarkListener] ⚠️ Error al consultar identidad:', error)
          // No fallar el proceso si la consulta de identidad falla
        }
      })()
      console.log('[RemarkListener] ✅ Emergencia guardada en IndexedDB:', emergency.emergencyId)

      if (this.callbacks.onEmergencyReceived) {
        this.callbacks.onEmergencyReceived(emergency)
      }

      this.remarksFound++
      console.log('[RemarkListener] ✅ Emergencia procesada completamente:', {
        emergencyId: emergency.emergencyId,
        blockNumber,
        blockHash: blockHash.substring(0, 20) + '...',
        totalProcesadas: this.remarksFound,
      })
    } catch (error) {
      console.error('[RemarkListener] ❌ Error al procesar emergencia:', error)
      if (this.callbacks.onError) {
        this.callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }

  /**
   * Obtiene el tipo de evento
   */
  private getEventType(event: any): BlockchainEvent['type'] {
    if (event.section === 'system' && event.method === 'Remarked') {
      return 'System.Remarked'
    }
    if (event.section === 'system' && event.method === 'ExtrinsicSuccess') {
      return 'System.ExtrinsicSuccess'
    }
    if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
      return 'System.ExtrinsicFailed'
    }
    if (event.section === 'balances' && event.method === 'Transfer') {
      return 'Balances.Transfer'
    }
    return 'other'
  }

  /**
   * Extrae el accountId de un evento
   */
  private extractAccountId(event: any): string | undefined {
    try {
      if (event.data && event.data.length > 0) {
        const first = event.data[0]
        if (first && typeof first.toString === 'function') {
          return first.toString()
        }
      }
      return undefined
    } catch {
      return undefined
    }
  }

  /**
   * Inicia verificación periódica de conexión
   */
  private startConnectionCheck(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
    }

    this.connectionCheckInterval = setInterval(() => {
      if (!this.isListening) {
        return
      }

      const timeSinceLastEvent = Date.now() - this.lastEventTime
      if (timeSinceLastEvent > 120000) {
        console.warn('[RemarkListener] ⚠️ No se han recibido eventos en 2 minutos')
      }
    }, 60000) // Verificar cada minuto
  }

  /**
   * Detiene la escucha
   */
  public stop(): void {
    this.isListening = false

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }

    if (this.unsubscribe) {
      try {
        this.unsubscribe()
      } catch (error) {
        console.warn('[RemarkListener] ⚠️ Error al cancelar suscripción:', error)
      }
      this.unsubscribe = null
    }

    if (this.api) {
      this.api.disconnect()
      this.api = null
    }

    if (this.provider) {
      this.provider.disconnect()
      this.provider = null
    }

    this.activeAccount = null
    this.lastEventTime = 0
    this.blocksProcessed = 0
    this.remarksFound = 0
    this.allEvents = []
    this.processedEvents.clear()

    console.log('[RemarkListener] ✅ Escucha detenida')
  }

  /**
   * Verifica si está escuchando
   */
  public getIsListening(): boolean {
    return this.isListening
  }

  /**
   * Obtiene el historial de eventos
   */
  public getEventsHistory(): BlockchainEvent[] {
    return [...this.allEvents]
  }

  /**
   * Limpia el historial de eventos
   */
  public clearEventsHistory(): void {
    this.allEvents = []
  }
}
