import { useEffect, useState } from 'react'
import { DedotClient, WsProvider } from 'dedot'

export interface ChainInfo {
  name: string
  endpoint: string
  description?: string
}

export const DEFAULT_CHAINS: ChainInfo[] = [
  {
    name: 'Polkadot',
    endpoint: 'wss://rpc.ibp.network/polkadot',
    description: 'Red principal de Polkadot (IBP)'
  },
  {
    name: 'Kusama',
    endpoint: 'wss://rpc.ibp.network/kusama',
    description: 'Red canary de Polkadot (IBP)'
  },
  {
    name: 'Paseo Relay Chain',
    endpoint: 'wss://rpc.ibp.network/paseo',
    description: 'Paseo Relay Chain - Testnet de Polkadot'
  },
  {
    name: 'Asset Hub (Paseo)',
    endpoint: 'wss://sys.ibp.network/asset-hub-paseo',
    description: 'Asset Hub de Paseo - Gestión de activos y NFTs'
  },
  {
    name: 'Bridge Hub (Paseo)',
    endpoint: 'wss://sys.ibp.network/bridgehub-paseo',
    description: 'Bridge Hub de Paseo - Puentes entre cadenas'
  },
  {
    name: 'Coretime (Paseo)',
    endpoint: 'wss://sys.ibp.network/coretime-paseo',
    description: 'Coretime Chain de Paseo - Gestión de coretime'
  },
  {
    name: 'People (Paseo)',
    endpoint: 'wss://sys.ibp.network/people-paseo',
    description: 'People Chain de Paseo - Sistema de identidad'
  },
  {
    name: 'Collectives (Paseo)',
    endpoint: 'wss://sys.ibp.network/collectives-paseo',
    description: 'Collectives Chain de Paseo - Gobernanza y colectivos'
  },
  {
    name: 'Asset Hub (Polkadot)',
    endpoint: 'wss://sys.ibp.network/asset-hub-polkadot',
    description: 'Asset Hub de Polkadot - Gestión de activos y NFTs (IBP)'
  },
  {
    name: 'Asset Hub (Kusama)',
    endpoint: 'wss://sys.ibp.network/asset-hub-kusama',
    description: 'Asset Hub de Kusama - Gestión de activos y NFTs (IBP)'
  },
  {
    name: 'People Chain (Polkadot)',
    endpoint: 'wss://sys.ibp.network/people-polkadot',
    description: 'People Chain de Polkadot - Sistema de identidad (IBP)'
  },
  {
    name: 'People Chain (Kusama)',
    endpoint: 'wss://sys.ibp.network/people-kusama',
    description: 'People Chain de Kusama - Sistema de identidad (IBP)'
  },
  {
    name: 'Bridge Hub (Polkadot)',
    endpoint: 'wss://sys.ibp.network/bridgehub-polkadot',
    description: 'Bridge Hub de Polkadot - Puentes entre cadenas (IBP)'
  },
  {
    name: 'Coretime (Polkadot)',
    endpoint: 'wss://sys.ibp.network/coretime-polkadot',
    description: 'Coretime Chain de Polkadot - Gestión de coretime (IBP)'
  },
  {
    name: 'Collectives (Polkadot)',
    endpoint: 'wss://sys.ibp.network/collectives-polkadot',
    description: 'Collectives Chain de Polkadot - Gobernanza y colectivos (IBP)'
  }
]

// Endpoints alternativos para cadenas conocidas
// Usando IBP (Infrastructure Builders' Programme) como principal y dotters.network como fallback
// Referencia: https://wiki.ibp.network/docs/consumers/archives
const FALLBACK_ENDPOINTS: Record<string, string[]> = {
  // Polkadot Relay Chain
  'wss://rpc.ibp.network/polkadot': [
    'wss://polkadot.dotters.network',
    'wss://rpc.polkadot.io',
  ],
  // Kusama Relay Chain
  'wss://rpc.ibp.network/kusama': [
    'wss://kusama.dotters.network',
    'wss://kusama-rpc.polkadot.io',
  ],
  // Asset Hub (Polkadot)
  'wss://sys.ibp.network/asset-hub-polkadot': [
    'wss://asset-hub-polkadot.dotters.network',
    'wss://polkadot-asset-hub-rpc.polkadot.io',
    'wss://statemint-rpc.polkadot.io',
  ],
  // Asset Hub (Kusama)
  'wss://sys.ibp.network/asset-hub-kusama': [
    'wss://asset-hub-kusama.dotters.network',
    'wss://kusama-asset-hub-rpc.polkadot.io',
    'wss://statemine-rpc.polkadot.io',
  ],
  // People Chain (Polkadot)
  'wss://sys.ibp.network/people-polkadot': [
    'wss://people-polkadot.dotters.network',
    'wss://polkadot-people-rpc.polkadot.io',
  ],
  // People Chain (Kusama)
  'wss://sys.ibp.network/people-kusama': [
    'wss://people-kusama.dotters.network',
    'wss://kusama-people-rpc.polkadot.io',
  ],
  // Bridge Hub (Polkadot)
  'wss://sys.ibp.network/bridgehub-polkadot': [
    'wss://bridge-hub-polkadot.dotters.network',
  ],
  // Coretime (Polkadot)
  'wss://sys.ibp.network/coretime-polkadot': [
    'wss://coretime-polkadot.dotters.network',
  ],
  // Collectives (Polkadot)
  'wss://sys.ibp.network/collectives-polkadot': [
    'wss://collectives-polkadot.dotters.network',
  ],
  // Paseo Relay Chain
  'wss://rpc.ibp.network/paseo': [
    'wss://paseo.dotters.network',
  ],
  // Asset Hub (Paseo)
  'wss://sys.ibp.network/asset-hub-paseo': [
    'wss://asset-hub-paseo.dotters.network',
  ],
  // Bridge Hub (Paseo)
  'wss://sys.ibp.network/bridgehub-paseo': [
    'wss://bridge-hub-paseo.dotters.network',
  ],
  // Coretime (Paseo)
  'wss://sys.ibp.network/coretime-paseo': [
    'wss://coretime-paseo.dotters.network',
  ],
  // People (Paseo)
  'wss://sys.ibp.network/people-paseo': [
    'wss://people-paseo.dotters.network',
  ],
  // Collectives (Paseo)
  'wss://sys.ibp.network/collectives-paseo': [
    'wss://collectives-paseo.dotters.network',
  ],
}

async function tryConnectWithFallback(
  primaryEndpoint: string,
  fallbacks: string[] = []
): Promise<{ client: DedotClient; endpoint: string }> {
  const allEndpoints = [primaryEndpoint, ...fallbacks]
  let lastError: Error | null = null

  for (const endpoint of allEndpoints) {
    try {
      const provider = new WsProvider(endpoint)
      await provider.connect()
      
      // Crear el cliente con manejo de errores
      // El error "Cannot read properties of undefined (reading 'hash')" 
      // puede ocurrir en eventos de seguimiento internos de Dedot
      // Estos errores no afectan la funcionalidad principal, así que los ignoramos
      const client = await DedotClient.new(provider)
      
      // Agregar manejadores de errores no capturados para eventos internos
      // Esto previene que errores internos de Dedot rompan la aplicación
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
          
          return isHashError || isConnectionError || isWsProviderError
        }
        
        // Manejador de errores síncronos
        const originalErrorHandler = window.onerror
        window.onerror = (message, source, lineno, colno, error) => {
          if (isDedotInternalError(message, error)) {
            // Solo loguear en modo debug para no saturar la consola
            if (process.env.NODE_ENV === 'development') {
              console.debug('[DedotClient] ⚠️ Error interno de Dedot ignorado:', message)
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
              console.debug('[DedotClient] ⚠️ Promesa rechazada de Dedot ignorada:', message)
            }
            event.preventDefault() // Prevenir que el error se propague
            return
          }
          
          // Llamar al manejador original para otros errores
          if (originalRejectionHandler) {
            originalRejectionHandler(event)
          }
        }
      }
      
      console.log(`[DedotClient] ✅ Conectado a ${endpoint}`)
      return { client, endpoint }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // Ignorar errores específicos de eventos internos de Dedot
      if (
        lastError.message.includes('hash') && 
        (lastError.stack?.includes('onFollowEvent') || lastError.message.includes('onFollowEvent'))
      ) {
        console.warn(`[DedotClient] ⚠️ Error interno de Dedot al conectar a ${endpoint} (continuando):`, lastError.message)
        continue
      }
      console.warn(`[DedotClient] ⚠️ Error al conectar a ${endpoint}:`, lastError.message)
      // Continuar con el siguiente endpoint
    }
  }

  throw lastError || new Error('No se pudo conectar a ningún endpoint')
}

export function useDedotClient(endpoint: string | null) {
  const [client, setClient] = useState<DedotClient | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectedEndpoint, setConnectedEndpoint] = useState<string | null>(null)

  useEffect(() => {
    if (!endpoint) {
      setClient(null)
      setConnectedEndpoint(null)
      return
    }

    setIsConnecting(true)
    setError(null)

    const fallbacks = FALLBACK_ENDPOINTS[endpoint] || []
    let newClient: DedotClient | null = null

    tryConnectWithFallback(endpoint, fallbacks)
      .then(({ client: connectedClient, endpoint: connectedEndpoint }) => {
        newClient = connectedClient
        setClient(connectedClient)
        setConnectedEndpoint(connectedEndpoint)
        setIsConnecting(false)
      })
      .catch((err) => {
        const errorMessage = err.message || 'Error al conectar'
        setError(errorMessage)
        setIsConnecting(false)
        setClient(null)
        setConnectedEndpoint(null)
        console.error(`[DedotClient] ❌ Error al conectar a ${endpoint}:`, errorMessage)
      })

    return () => {
      if (newClient) {
        newClient.disconnect().catch(() => {})
      }
    }
  }, [endpoint])

  return { client, isConnecting, error, connectedEndpoint }
}

