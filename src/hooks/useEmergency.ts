/**
 * Hook para manejar emergencias en la bitácora
 */

import { useState, useCallback } from 'react'
import { useNetwork } from '@/contexts/NetworkContext'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { toast } from 'sonner'
import type { 
  Emergency, 
  CreateEmergencyData, 
  EmergencySubmissionResult 
} from '@/types/emergencies'
import {
  createEmergencyLocal,
  submitEmergencyToBlockchain,
  updateEmergencyWithBlockchainResult,
} from '@/services/emergencies/EmergencyService'
import { saveEmergency, getAllEmergencies, getEmergenciesByLogId as getEmergenciesByLogIdStorage } from '@/utils/emergencyStorage'
import { saveTransaction, type StoredTransaction } from '@/utils/transactionStorage'
import { useEffect } from 'react'

export function useEmergency() {
  const { client, isConnecting, error: networkError, selectedChain } = useNetwork()
  const { accounts, getAccount, isUnlocked } = useKeyringContext()
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Cargar emergencias desde IndexedDB al montar el componente
  useEffect(() => {
    const loadEmergencies = async () => {
      try {
        const loaded = await getAllEmergencies()
        setEmergencies(loaded)
      } catch (error) {
        console.error('[useEmergency] Error al cargar emergencias:', error)
      }
    }
    loadEmergencies()
  }, [])

  /**
   * Crea una emergencia y la envía a blockchain
   */
  const createAndSubmitEmergency = useCallback(async (
    data: CreateEmergencyData,
    accountAddress?: string
  ): Promise<Emergency | null> => {
    if (!isUnlocked || accounts.length === 0) {
      toast.error('Debes desbloquear la wallet y tener una cuenta activa')
      return null
    }

    // Seleccionar cuenta
    const selectedAccount = accountAddress 
      ? getAccount(accountAddress)
      : accounts[0]

    if (!selectedAccount) {
      toast.error('No se encontró la cuenta seleccionada')
      return null
    }

    // Verificar cliente blockchain
    console.log('[useEmergency] Estado de conexión:', {
      client: !!client,
      isConnecting,
      networkError,
    })
    
    if (isConnecting) {
      toast.info('Conectando a la blockchain...', {
        description: 'Por favor espera un momento'
      })
      return null
    }
    
    if (!client) {
      const errorMsg = networkError || 'No hay conexión a la blockchain. Verifica que la red esté seleccionada.'
      console.error('[useEmergency] ❌ Cliente no disponible:', { networkError, isConnecting })
      toast.error('Sin conexión a la blockchain', {
        description: errorMsg
      })
      return null
    }
    
    console.log('[useEmergency] ✅ Cliente disponible, procediendo con emergencia')

    try {
      setSubmitting(true)
      toast.info('Creando emergencia...')

      // 1. Crear emergencia localmente
      const emergency = createEmergencyLocal(data, selectedAccount.address)
      
      // Guardar en IndexedDB
      await saveEmergency(emergency)
      setEmergencies(prev => [...prev, emergency])

      // 2. Enviar a blockchain
      toast.info('Enviando emergencia a blockchain...')
      
      // Obtener el KeyringPair desde la cuenta
      if (!selectedAccount.pair) {
        throw new Error('No se pudo obtener el par de claves. Asegúrate de que la wallet esté desbloqueada.')
      }

      // Obtener información de la cadena
      if (!selectedChain) {
        throw new Error('No hay una cadena seleccionada')
      }

      const result = await submitEmergencyToBlockchain(
        client,
        selectedAccount.pair,
        emergency,
        undefined // No hay datos de bitácora en Emergency Wallet
      )

      // 3. Actualizar emergencia con resultado
      const updatedEmergency = updateEmergencyWithBlockchainResult(emergency, result)
      
      // Guardar actualización en IndexedDB
      await saveEmergency(updatedEmergency)
      setEmergencies(prev => 
        prev.map(e => e.emergencyId === emergency.emergencyId ? updatedEmergency : e)
      )

      // 4. Guardar como transacción en transactionStorage si fue exitosa
      if (result.success && result.txHash && selectedChain) {
        try {
          const storedTx: StoredTransaction = {
            id: result.txHash,
            accountAddress: selectedAccount.address,
            toAddress: '', // Las emergencias no tienen destinatario
            amount: '0', // No es transferencia de fondos
            chain: selectedChain.name,
            chainEndpoint: selectedChain.endpoint,
            type: 'other', // Tipo especial para emergencias
            status: 'finalized', // Ya está finalizada cuando llega aquí
            txHash: result.txHash,
            blockHash: undefined,
            blockNumber: result.blockNumber,
            nonce: undefined,
            tip: undefined,
            fee: undefined,
            error: undefined,
            metadata: {
              emergencyId: emergency.emergencyId,
              emergencyType: emergency.type,
              emergencySeverity: emergency.severity,
              relatedLogId: emergency.relatedLogId,
            },
            createdAt: emergency.createdAt,
            finalizedAt: Date.now(),
            updatedAt: Date.now(),
          }
          console.log('[useEmergency] Guardando transacción de emergencia:', {
            id: storedTx.id,
            txHash: storedTx.txHash,
            accountAddress: storedTx.accountAddress,
            chain: storedTx.chain,
            metadata: storedTx.metadata,
          })
          await saveTransaction(storedTx)
          console.log('[useEmergency] ✅ Transacción de emergencia guardada exitosamente en transactionStorage')
          
          // Verificar que se guardó correctamente
          const { getTransaction } = await import('@/utils/transactionStorage')
          const saved = await getTransaction(result.txHash)
          if (saved) {
            console.log('[useEmergency] ✅ Verificación: Transacción encontrada en storage:', saved)
          } else {
            console.warn('[useEmergency] ⚠️ Verificación: Transacción NO encontrada en storage después de guardar')
          }
        } catch (err) {
          console.error('[useEmergency] ❌ Error al guardar transacción de emergencia:', err)
          // No fallar la operación si falla guardar la transacción
        }
      } else {
        console.warn('[useEmergency] ⚠️ No se guardó transacción de emergencia:', {
          success: result.success,
          txHash: result.txHash,
          hasChain: !!selectedChain,
        })
      }

      if (result.success) {
        toast.success('Emergencia enviada exitosamente a la blockchain', {
          description: result.txHash 
            ? `Transacción: ${result.txHash.substring(0, 16)}...`
            : undefined
        })
        return updatedEmergency
      } else {
        toast.error('Error al enviar emergencia', {
          description: result.error
        })
        return updatedEmergency // Retornar aunque haya fallado, para que quede guardada localmente
      }
    } catch (error) {
      console.error('[useEmergency] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      toast.error('Error al crear emergencia', {
        description: errorMessage
      })
      return null
    } finally {
      setSubmitting(false)
    }
  }, [client, isConnecting, networkError, selectedChain, accounts, getAccount, isUnlocked])

  /**
   * Obtiene emergencias relacionadas con una bitácora
   */
  const getEmergenciesByLogId = useCallback(async (logId: string): Promise<Emergency[]> => {
    try {
      // Cargar desde IndexedDB para asegurar datos actualizados
      const stored = await getEmergenciesByLogIdStorage(logId)
      // Actualizar estado local si hay cambios
      setEmergencies(prev => {
        const existingIds = new Set(prev.map(e => e.emergencyId))
        const newEmergencies = stored.filter(e => !existingIds.has(e.emergencyId))
        if (newEmergencies.length > 0) {
          return [...prev, ...newEmergencies]
        }
        return prev
      })
      return stored
    } catch (error) {
      console.error('[useEmergency] Error al obtener emergencias por logId:', error)
      // Fallback a estado local
      return emergencies.filter(e => e.relatedLogId === logId)
    }
  }, [emergencies])

  /**
   * Obtiene la emergencia activa de una bitácora
   */
  const getActiveEmergency = useCallback(async (logId: string): Promise<Emergency | null> => {
    const logEmergencies = await getEmergenciesByLogId(logId)
    return logEmergencies.find(e => 
      e.status === 'pending' || 
      e.status === 'submitted' || 
      e.status === 'acknowledged' || 
      e.status === 'in_progress'
    ) || null
  }, [getEmergenciesByLogId])

  return {
    emergencies,
    submitting,
    createAndSubmitEmergency,
    getEmergenciesByLogId,
    getActiveEmergency,
  }
}
