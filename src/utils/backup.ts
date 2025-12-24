/**
 * Utilidades para hacer backup e importar datos de la aplicación
 */

import { openSharedDB } from './indexedDB'
import type { EncryptedAccount } from './secureStorage'
import type { WebAuthnCredential } from './webauthn'
import type { StoredTransaction } from './transactionStorage'

export interface BackupData {
  version: string
  createdAt: number
  accounts: EncryptedAccount[]
  webauthnCredentials: WebAuthnCredential[]
  transactions: StoredTransaction[]
  contacts: any[]
  apiConfigs: any[]
  metadata?: {
    appName: string
    appVersion?: string
    description?: string
  }
}

const BACKUP_VERSION = '1.0.0'
const CONTACTS_STORAGE_KEY = 'aura-wallet-contacts'
const API_CONFIGS_STORAGE_KEY = 'aura-wallet-api-configs'

/**
 * Exporta todos los datos de la aplicación a un objeto JSON
 */
export async function exportBackup(): Promise<BackupData> {
  console.log('[Backup] Iniciando exportación de datos...')

  // 1. Obtener cuentas encriptadas de IndexedDB
  const accounts: EncryptedAccount[] = []
  try {
    const db = await openSharedDB()
    const transaction = db.transaction(['encrypted-accounts'], 'readonly')
    const store = transaction.objectStore('encrypted-accounts')
    const request = store.getAll()

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as EncryptedAccount[]
        accounts.push(...results)
        console.log(`[Backup] ✅ ${results.length} cuenta(s) encontrada(s) en IndexedDB`)
        // Esperar a que la transacción se complete
      }
      request.onerror = () => {
        const error = request.error || new Error('Error al leer cuentas')
        console.error('[Backup] ❌ Error al leer cuentas:', error)
        reject(error)
      }
      
      // Esperar a que la transacción se complete para asegurar que los datos estén disponibles
      transaction.oncomplete = () => {
        console.log(`[Backup] ✅ Transacción completada - ${accounts.length} cuenta(s) exportada(s)`)
        resolve()
      }
      
      transaction.onerror = () => {
        const error = transaction.error || request.error || new Error('Error en la transacción')
        console.error('[Backup] ❌ Error en transacción al leer cuentas:', error)
        reject(error)
      }
    })
  } catch (error) {
    console.error('[Backup] ❌ Error al acceder a cuentas:', error)
    throw error
  }

  // 2. Obtener credenciales WebAuthn de IndexedDB
  const webauthnCredentials: WebAuthnCredential[] = []
  try {
    const db = await openSharedDB()
    const transaction = db.transaction(['webauthn-credentials'], 'readonly')
    const store = transaction.objectStore('webauthn-credentials')
    const request = store.getAll()

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as WebAuthnCredential[]
        webauthnCredentials.push(...results)
        console.log(`[Backup] ✅ ${results.length} credencial(es) WebAuthn exportada(s)`)
        resolve()
      }
      request.onerror = () => {
        const error = request.error || new Error('Error al leer credenciales WebAuthn')
        console.error('[Backup] ❌ Error al leer credenciales WebAuthn:', error)
        reject(error)
      }
    })
  } catch (error) {
    console.error('[Backup] ❌ Error al acceder a credenciales WebAuthn:', error)
    // No fallar si no hay credenciales WebAuthn
  }

  // 3. Obtener contactos de localStorage
  const contacts: any[] = []
  try {
    const stored = localStorage.getItem(CONTACTS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      contacts.push(...(Array.isArray(parsed) ? parsed : []))
      console.log(`[Backup] ✅ ${contacts.length} contacto(s) exportado(s)`)
    }
  } catch (error) {
    console.error('[Backup] ❌ Error al leer contactos:', error)
    // No fallar si no hay contactos
  }

  // 5. Obtener configuraciones de API de localStorage
  const apiConfigs: any[] = []
  try {
    const stored = localStorage.getItem(API_CONFIGS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      apiConfigs.push(...(Array.isArray(parsed) ? parsed : []))
      console.log(`[Backup] ✅ ${apiConfigs.length} configuración(es) de API exportada(s)`)
    }
  } catch (error) {
    console.error('[Backup] ❌ Error al leer configuraciones de API:', error)
    // No fallar si no hay configuraciones
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    createdAt: Date.now(),
    accounts,
    webauthnCredentials,
    transactions,
    contacts,
    apiConfigs,
    metadata: {
      appName: 'Aura Wallet',
      description: 'Backup de datos de Aura Wallet',
    },
  }

  console.log('[Backup] ✅ Exportación completada')
  return backup
}

/**
 * Descarga el backup como archivo JSON
 */
export async function downloadBackup(): Promise<void> {
  try {
    console.log('[Backup] Iniciando exportación...')
    const backup = await exportBackup()
    console.log('[Backup] Exportación completada, creando archivo...')
    
    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    console.log('[Backup] Blob creado, tamaño:', blob.size, 'bytes')
    
    const link = document.createElement('a')
    link.href = url
    link.download = `aura-wallet-backup-${new Date().toISOString().split('T')[0]}.json`
    link.style.display = 'none'
    
    document.body.appendChild(link)
    console.log('[Backup] Link agregado al DOM, iniciando descarga...')
    
    // En dispositivos móviles, puede que necesitemos un pequeño delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    link.click()
    
    // Esperar un momento antes de limpiar
    setTimeout(() => {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('[Backup] ✅ Archivo descargado y recursos liberados')
    }, 1000)
    
    // Verificar si estamos en un entorno que soporta descargas
    if (typeof window !== 'undefined' && 'download' in document.createElement('a')) {
      console.log('[Backup] ✅ Navegador soporta descargas')
    } else {
      console.warn('[Backup] ⚠️ El navegador puede no soportar descargas automáticas')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[Backup] ❌ Error al descargar backup:', error)
    console.error('[Backup] Detalles del error:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    throw new Error(`Error al descargar backup: ${errorMessage}`)
  }
}

/**
 * Lee un archivo de backup desde un input de archivo
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const backup = JSON.parse(text) as BackupData
        
        // Validar estructura básica
        if (!backup.version || !backup.createdAt) {
          throw new Error('El archivo de backup no es válido: falta información de versión o fecha')
        }
        
        // Validar que tenga arrays (pueden estar vacíos)
        if (!Array.isArray(backup.accounts)) {
          backup.accounts = []
        }
        if (!Array.isArray(backup.webauthnCredentials)) {
          backup.webauthnCredentials = []
        }
        if (!Array.isArray(backup.transactions)) {
          backup.transactions = []
        }
        if (!Array.isArray(backup.contacts)) {
          backup.contacts = []
        }
        if (!Array.isArray(backup.apiConfigs)) {
          backup.apiConfigs = []
        }
        
        console.log('[Backup] ✅ Archivo de backup leído y validado')
        resolve(backup)
      } catch (error) {
        console.error('[Backup] ❌ Error al leer archivo de backup:', error)
        reject(new Error('El archivo de backup no es válido o está corrupto'))
      }
    }
    reader.onerror = () => {
      const error = new Error('Error al leer el archivo')
      console.error('[Backup] ❌', error)
      reject(error)
    }
    reader.readAsText(file)
  })
}

/**
 * Importa datos desde un backup
 * @param backup Datos del backup a importar
 * @param options Opciones de importación
 */
export async function importBackup(
  backup: BackupData,
  options: {
    overwriteAccounts?: boolean
    overwriteContacts?: boolean
    overwriteApiConfigs?: boolean
    overwriteWebAuthn?: boolean
  } = {}
): Promise<{
  accountsImported: number
  contactsImported: number
  apiConfigsImported: number
  webauthnImported: number
  errors: string[]
}> {
  console.log('[Backup] Iniciando importación de datos...')
  const errors: string[] = []
  let accountsImported = 0
  let contactsImported = 0
  let apiConfigsImported = 0
  let webauthnImported = 0
  let transactionsImported = 0

  // 1. Importar cuentas
  if (backup.accounts && backup.accounts.length > 0) {
    try {
      console.log(`[Backup] Importando ${backup.accounts.length} cuenta(s)...`)
      const db = await openSharedDB()
      const transaction = db.transaction(['encrypted-accounts'], 'readwrite')
      const store = transaction.objectStore('encrypted-accounts')

      // Importar cuentas una por una dentro de la transacción
      // (IndexedDB requiere que las operaciones se completen antes de que la transacción termine)
      for (const account of backup.accounts) {
        try {
          // Verificar si la cuenta ya existe
          const existingRequest = store.get(account.address)
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`[Backup] ⚠️ Timeout verificando cuenta ${account.address}`)
              resolve()
            }, 5000)

            existingRequest.onsuccess = () => {
              clearTimeout(timeout)
              const exists = existingRequest.result !== undefined
              if (exists && !options.overwriteAccounts) {
                console.log(`[Backup] ⚠️ Cuenta ${account.address} ya existe, omitiendo`)
                resolve()
                return
              }

              const putRequest = store.put(account)
              putRequest.onsuccess = () => {
                accountsImported++
                console.log(`[Backup] ✅ Cuenta importada: ${account.address}`)
                resolve()
              }
              putRequest.onerror = () => {
                const error = putRequest.error || new Error('Error al importar cuenta')
                errors.push(`Error al importar cuenta ${account.address}: ${error.message}`)
                console.error('[Backup] ❌', error)
                resolve() // Continuar con las siguientes
              }
            }
            
            existingRequest.onerror = () => {
              clearTimeout(timeout)
              const error = existingRequest.error || new Error('Error al verificar cuenta')
              errors.push(`Error al verificar cuenta ${account.address}: ${error.message}`)
              console.error('[Backup] ❌', error)
              resolve() // Continuar con las siguientes
            }
          })
        } catch (error) {
          errors.push(`Error al importar cuenta ${account.address}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }
      
      console.log(`[Backup] ✅ ${accountsImported} cuenta(s) procesada(s) de ${backup.accounts.length}`)

      // Esperar a que la transacción se complete completamente
      await new Promise<void>((resolve) => {
        // Timeout de seguridad para evitar que se quede colgado
        const timeout = setTimeout(() => {
          console.warn('[Backup] ⚠️ Timeout esperando transacción de cuentas')
          resolve()
        }, 10000) // 10 segundos

        transaction.oncomplete = () => {
          clearTimeout(timeout)
          console.log('[Backup] ✅ Transacción de cuentas completada')
          // Esperar un momento adicional para asegurar que IndexedDB se haya actualizado
          setTimeout(() => {
            resolve()
          }, 100)
        }
        transaction.onerror = () => {
          clearTimeout(timeout)
          const error = transaction.error || new Error('Error en la transacción de cuentas')
          errors.push(`Error en la transacción de cuentas: ${error.message}`)
          console.error('[Backup] ❌ Error en transacción de cuentas:', error)
          resolve()
        }
      })
      
      // Verificar que las cuentas se guardaron correctamente
      if (accountsImported > 0) {
        try {
          const db = await openSharedDB()
          const verifyTransaction = db.transaction(['encrypted-accounts'], 'readonly')
          const verifyStore = verifyTransaction.objectStore('encrypted-accounts')
          const verifyRequest = verifyStore.count()
          
          await new Promise<void>((resolve) => {
            verifyRequest.onsuccess = () => {
              const count = verifyRequest.result
              console.log(`[Backup] ✅ Verificación: ${count} cuenta(s) en IndexedDB después de importación`)
              resolve()
            }
            verifyRequest.onerror = () => {
              console.warn('[Backup] ⚠️ No se pudo verificar el conteo de cuentas')
              resolve()
            }
          })
        } catch (error) {
          console.warn('[Backup] ⚠️ Error al verificar cuentas importadas:', error)
        }
      }
    } catch (error) {
      errors.push(`Error al importar cuentas: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 2. Importar credenciales WebAuthn
  if (backup.webauthnCredentials && backup.webauthnCredentials.length > 0) {
    try {
      const db = await openSharedDB()
      const transaction = db.transaction(['webauthn-credentials'], 'readwrite')
      const store = transaction.objectStore('webauthn-credentials')

      for (const credential of backup.webauthnCredentials) {
        try {
          const existingRequest = store.get(credential.id)
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              console.warn(`[Backup] ⚠️ Timeout verificando credencial WebAuthn ${credential.id}`)
              resolve()
            }, 5000)

            existingRequest.onsuccess = () => {
              clearTimeout(timeout)
              const exists = existingRequest.result !== undefined
              if (exists && !options.overwriteWebAuthn) {
                console.log(`[Backup] ⚠️ Credencial WebAuthn ${credential.id} ya existe, omitiendo`)
                resolve()
                return
              }

              const putRequest = store.put(credential)
              putRequest.onsuccess = () => {
                webauthnImported++
                console.log(`[Backup] ✅ Credencial WebAuthn importada: ${credential.id}`)
                resolve()
              }
              putRequest.onerror = () => {
                const error = putRequest.error || new Error('Error al importar credencial WebAuthn')
                errors.push(`Error al importar credencial WebAuthn ${credential.id}: ${error.message}`)
                console.error('[Backup] ❌', error)
                resolve()
              }
            }
            existingRequest.onerror = () => {
              clearTimeout(timeout)
              errors.push(`Error al verificar credencial WebAuthn ${credential.id}`)
              resolve()
            }
          })
        } catch (error) {
          errors.push(`Error al importar credencial WebAuthn ${credential.id}`)
        }
      }
      
      console.log(`[Backup] ✅ ${webauthnImported} credencial(es) WebAuthn procesada(s) de ${backup.webauthnCredentials.length}`)

      await new Promise<void>((resolve) => {
        // Timeout de seguridad
        const timeout = setTimeout(() => {
          console.warn('[Backup] ⚠️ Timeout esperando transacción de WebAuthn')
          resolve()
        }, 10000)

        transaction.oncomplete = () => {
          clearTimeout(timeout)
          console.log('[Backup] ✅ Transacción de WebAuthn completada')
          resolve()
        }
        transaction.onerror = () => {
          clearTimeout(timeout)
          const error = transaction.error || new Error('Error en la transacción de credenciales WebAuthn')
          errors.push(`Error en la transacción de credenciales WebAuthn: ${error.message}`)
          console.error('[Backup] ❌ Error en transacción de WebAuthn:', error)
          resolve()
        }
      })
    } catch (error) {
      errors.push(`Error al importar credenciales WebAuthn: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 3. Importar contactos
  if (backup.contacts && backup.contacts.length > 0) {
    try {
      const existing = localStorage.getItem(CONTACTS_STORAGE_KEY)
      let existingContacts: any[] = []
      
      if (existing && !options.overwriteContacts) {
        try {
          existingContacts = JSON.parse(existing)
        } catch (e) {
          // Si hay error, empezar de cero
        }
      }

      // Combinar contactos (evitar duplicados por ID)
      const contactMap = new Map<string, any>()
      existingContacts.forEach((c: any) => contactMap.set(c.id, c))
      backup.contacts.forEach((c: any) => {
        if (!contactMap.has(c.id) || options.overwriteContacts) {
          contactMap.set(c.id, c)
        }
      })

      const mergedContacts = Array.from(contactMap.values())
      localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(mergedContacts))
      contactsImported = mergedContacts.length - (options.overwriteContacts ? 0 : existingContacts.length)
      console.log(`[Backup] ✅ ${contactsImported} contacto(s) importado(s)`)
    } catch (error) {
      errors.push(`Error al importar contactos: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 4. Importar configuraciones de API
  if (backup.apiConfigs && backup.apiConfigs.length > 0) {
    try {
      const existing = localStorage.getItem(API_CONFIGS_STORAGE_KEY)
      let existingConfigs: any[] = []
      
      if (existing && !options.overwriteApiConfigs) {
        try {
          existingConfigs = JSON.parse(existing)
        } catch (e) {
          // Si hay error, empezar de cero
        }
      }

      // Combinar configuraciones (evitar duplicados por ID)
      const configMap = new Map<string, any>()
      existingConfigs.forEach((c: any) => configMap.set(c.id, c))
      backup.apiConfigs.forEach((c: any) => {
        if (!configMap.has(c.id) || options.overwriteApiConfigs) {
          configMap.set(c.id, c)
        }
      })

      const mergedConfigs = Array.from(configMap.values())
      localStorage.setItem(API_CONFIGS_STORAGE_KEY, JSON.stringify(mergedConfigs))
      apiConfigsImported = mergedConfigs.length - (options.overwriteApiConfigs ? 0 : existingConfigs.length)
      console.log(`[Backup] ✅ ${apiConfigsImported} configuración(es) de API importada(s)`)
    } catch (error) {
      errors.push(`Error al importar configuraciones de API: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 5. Importar transacciones
  if (backup.transactions && backup.transactions.length > 0) {
    try {
      console.log(`[Backup] Importando ${backup.transactions.length} transacción(es)...`)
      const db = await openSharedDB()
      const transaction = db.transaction(['transactions'], 'readwrite')
      const store = transaction.objectStore('transactions')

      for (const tx of backup.transactions) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.warn(`[Backup] ⚠️ Timeout verificando transacción ${tx.id}`)
            resolve()
          }, 5000)

          try {
            const existingRequest = store.get(tx.id)
            existingRequest.onsuccess = () => {
              clearTimeout(timeout)
              const exists = existingRequest.result !== undefined
              if (exists && !options.overwriteAccounts) {
                console.log(`[Backup] ⚠️ Transacción ${tx.id} ya existe, omitiendo`)
                resolve()
                return
              }

              const putRequest = store.put(tx)
              putRequest.onsuccess = () => {
                transactionsImported++
                console.log(`[Backup] ✅ Transacción importada: ${tx.id}`)
                resolve()
              }
              putRequest.onerror = () => {
                const error = putRequest.error || new Error('Error al importar transacción')
                errors.push(`Error al importar transacción ${tx.id}: ${error.message}`)
                console.error('[Backup] ❌', error)
                resolve()
              }
            }
            existingRequest.onerror = () => {
              clearTimeout(timeout)
              errors.push(`Error al verificar transacción ${tx.id}`)
              resolve()
            }
          } catch (error) {
            errors.push(`Error al procesar transacción ${tx.id}`)
            clearTimeout(timeout)
            resolve()
          }
        })
      }
      
      console.log(`[Backup] ✅ ${transactionsImported} transacción(es) procesada(s) de ${backup.transactions.length}`)

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('[Backup] ⚠️ Timeout esperando transacción de transacciones')
          resolve()
        }, 10000)

        transaction.oncomplete = () => {
          clearTimeout(timeout)
          console.log('[Backup] ✅ Transacción de transacciones completada')
          resolve()
        }
        transaction.onerror = () => {
          clearTimeout(timeout)
          const error = transaction.error || new Error('Error en la transacción de transacciones')
          errors.push(`Error en la transacción de transacciones: ${error.message}`)
          console.error('[Backup] ❌ Error en transacción de transacciones:', error)
          resolve()
        }
      })
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      errors.push(`Error al importar transacciones: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log('[Backup] ✅ Importación completada')
  return {
    accountsImported,
    contactsImported,
    apiConfigsImported,
    webauthnImported,
    transactionsImported,
    errors,
  }
}

