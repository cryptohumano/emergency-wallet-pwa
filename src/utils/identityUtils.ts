/**
 * Utilidades para consultar identidad en múltiples cadenas
 */

import { DedotClient } from 'dedot'
import { WsProvider } from 'dedot'
import type { IdentityInfo } from '@/hooks/usePeopleChainIdentity'

// Endpoints de People Chain
const PEOPLE_CHAIN_ENDPOINTS = {
  polkadot: 'wss://sys.ibp.network/people-polkadot',
  kusama: 'wss://sys.ibp.network/people-kusama',
  paseo: 'wss://sys.ibp.network/people-paseo',
}

/**
 * Obtiene la identidad de una cuenta en todas las cadenas disponibles
 * Retorna la primera identidad encontrada o null si no hay ninguna
 */
export async function fetchIdentityFromAllChains(
  address: string
): Promise<{ identity: IdentityInfo | null; chain: string | null }> {
  if (!address) {
    return { identity: null, chain: null }
  }

  // Intentar primero en PeopleChain (si estamos en una cadena que tenga PeopleChain)
  // Luego intentar en todas las cadenas de identidad disponibles
  const chainsToCheck = ['paseo', 'polkadot', 'kusama'] as const

  for (const network of chainsToCheck) {
    let client: DedotClient | null = null
    let provider: WsProvider | null = null
    
    try {
      const endpoint = PEOPLE_CHAIN_ENDPOINTS[network]
      provider = new WsProvider(endpoint)
      await provider.connect()
      client = await DedotClient.new(provider)

      console.log(`[Identity Utils] Consultando identidad para ${address} en ${network}...`)
      
      if (!client.query.identity) {
        console.warn(`[Identity Utils] ⚠️ El pallet 'identity' no está disponible en ${network}`)
        continue
      }

      const identityData = await client.query.identity.identityOf(address)
      console.log(`[Identity Utils] Resultado de query en ${network}:`, identityData)

      if (identityData === null || identityData === undefined) {
        continue
      }

      // Procesar la identidad
      let identityValue: any = null
      
      if (identityData && typeof identityData === 'object' && 'value' in identityData) {
        identityValue = identityData.value
      } else if (identityData && typeof identityData === 'object') {
        identityValue = identityData
      }

      if (identityValue) {
        const info = identityValue.info || {}
        const judgements = identityValue.judgements || []
        
        const extractValue = (field: any): string | undefined => {
          if (!field) return undefined
          if (typeof field === 'object' && 'value' in field) {
            return field.value
          }
          if (typeof field === 'string') {
            return field
          }
          return undefined
        }

        const identity: IdentityInfo = {
          display: extractValue(info.display),
          legal: extractValue(info.legal),
          web: extractValue(info.web),
          riot: extractValue(info.riot),
          email: extractValue(info.email),
          twitter: extractValue(info.twitter),
          additional: info.additional?.map((item: any) => {
            const key = Array.isArray(item) ? (item[0]?.value || item[0]) : item?.key
            const value = Array.isArray(item) ? (item[1]?.value || item[1]) : item?.value
            return {
              key: typeof key === 'string' ? key : '',
              value: typeof value === 'string' ? value : '',
            }
          }),
          judgements: judgements.map((j: any, index: number) => {
            if (Array.isArray(j) && j.length >= 2) {
              return {
                index: typeof j[0] === 'number' ? j[0] : index,
                judgement: j[1]?.toString() || 'Unknown',
              }
            }
            return {
              index,
              judgement: j?.toString() || 'Unknown',
            }
          }),
          deposit: identityValue.deposit ? BigInt(identityValue.deposit.toString()) : undefined,
        }

        console.log(`[Identity Utils] ✅ Identidad encontrada en ${network}:`, identity.display)
        
        // Desconectar antes de retornar
        try {
          if (client) {
            await client.disconnect()
          }
        } catch (disconnectError) {
          console.warn(`[Identity Utils] ⚠️ Error al desconectar cliente de ${network}:`, disconnectError)
        }
        
        return { identity, chain: network }
      }
    } catch (err: any) {
      console.warn(`[Identity Utils] ⚠️ Error al consultar identidad en ${network}:`, err.message)
    } finally {
      // Asegurar desconexión en el finally
      try {
        if (client) {
          await client.disconnect()
        } else if (provider) {
          provider.disconnect()
        }
      } catch (disconnectError) {
        // Ignorar errores de desconexión
      }
    }
  }

  console.log(`[Identity Utils] ⚠️ No se encontró identidad para ${address} en ninguna cadena`)
  return { identity: null, chain: null }
}
