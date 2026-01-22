import { useEffect, useState, useCallback } from 'react'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady, mnemonicGenerate } from '@polkadot/util-crypto'
import { u8aToHex, hexToU8a } from '@polkadot/util'
import type { KeyringPair } from '@polkadot/keyring/types'
import { encrypt, decrypt } from '@/utils/encryption'
import { 
  saveEncryptedAccount, 
  getAllEncryptedAccounts, 
  deleteEncryptedAccount,
  type EncryptedAccount 
} from '@/utils/secureStorage'
import {
  authenticateWithWebAuthn,
  type WebAuthnCredential
} from '@/utils/webauthn'
import {
  getWebAuthnCredential,
  updateWebAuthnCredentialUsage,
  getAllWebAuthnCredentials
} from '@/utils/webauthnStorage'

export interface KeyringAccount {
  pair: KeyringPair
  address: string
  publicKey: Uint8Array
  meta: {
    name?: string
    [key: string]: any
  }
}

export function useKeyring() {
  const [keyring, setKeyring] = useState<Keyring | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [accounts, setAccounts] = useState<KeyringAccount[]>([])
  const [isUnlocked, setIsUnlocked] = useState(false)
  // OPTIMIZACIÓN LCP: Inicializar como undefined para detectar cuando aún no se ha verificado
  const [hasStoredAccounts, setHasStoredAccounts] = useState<boolean | undefined>(undefined)
  const [hasWebAuthnCredentials, setHasWebAuthnCredentials] = useState<boolean | undefined>(undefined)

  // Función para verificar y actualizar el estado de credenciales WebAuthn
  const checkWebAuthnCredentials = useCallback(async () => {
    try {
      const webauthnCreds = await getAllWebAuthnCredentials()
      const hasCreds = webauthnCreds.length > 0
      setHasWebAuthnCredentials(hasCreds)
      console.log(`[Keyring] Credenciales WebAuthn: ${webauthnCreds.length} (actualizado)`)
      return hasCreds
    } catch (error) {
      console.error('[Keyring] ❌ Error al verificar credenciales WebAuthn:', error)
      setHasWebAuthnCredentials(false)
      return false
    }
  }, [])

  // Función para verificar y actualizar el estado de cuentas almacenadas
  const checkStoredAccounts = useCallback(async () => {
    try {
      const stored = await getAllEncryptedAccounts()
      const hasAccounts = stored.length > 0
      setHasStoredAccounts(hasAccounts)
      console.log(`[Keyring] Cuentas almacenadas: ${stored.length} (actualizado)`)
      return hasAccounts
    } catch (error) {
      console.error('[Keyring] ❌ Error al verificar cuentas almacenadas:', error)
      setHasStoredAccounts(false)
      return false
    }
  }, [])

  useEffect(() => {
    let isMounted = true // Flag para evitar actualizaciones después de desmontar
    
    // OPTIMIZACIÓN LCP: Verificar cuentas almacenadas inmediatamente (sin esperar cryptoWaitReady)
    // Esto permite que AuthGuard tome decisiones rápidamente
    checkStoredAccounts().catch(console.error)
    checkWebAuthnCredentials().catch(console.error)
    
    // OPTIMIZACIÓN LCP: Marcar como ready inmediatamente para permitir renderizado
    // La inicialización completa del keyring se hará en background
    setIsReady(true)
    
    const initKeyring = async () => {
      console.log('[Keyring] Iniciando inicialización en background...')
      try {
        console.log('[Keyring] Esperando cryptoWaitReady()...')
        await cryptoWaitReady()
        if (!isMounted) return
        
        console.log('[Keyring] cryptoWaitReady() completado')
        
        // Crear Keyring sin tipo específico para soportar múltiples tipos (sr25519, ed25519, ecdsa)
        const kr = new Keyring({ ss58Format: 42 })
        if (!isMounted) return
        setKeyring(kr)
        console.log('[Keyring] Keyring creado exitosamente')
        
        // Verificar nuevamente (por si acaso cambió algo)
        await checkStoredAccounts()
        await checkWebAuthnCredentials()
        
        console.log('[Keyring] ✅ Inicialización completada en background')
      } catch (error) {
        console.error('[Keyring] ❌ Error al inicializar keyring:', error)
        // No cambiar isReady aquí, ya está en true para permitir renderizado
      }
    }

    // Inicializar en background sin bloquear renderizado
    // Usar setTimeout para dar prioridad al renderizado inicial
    setTimeout(() => {
      initKeyring()
    }, 0)
    
    return () => {
      isMounted = false // Limpiar flag al desmontar
    }
  }, [checkStoredAccounts, checkWebAuthnCredentials])

  const generateMnemonic = useCallback(() => {
    return mnemonicGenerate()
  }, [])

  /**
   * Desbloquea el keyring con una contraseña
   * Carga las cuentas encriptadas desde IndexedDB
   */
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    if (!keyring) return false

    try {
      const encryptedAccounts = await getAllEncryptedAccounts()
      
      if (encryptedAccounts.length === 0) {
        setIsUnlocked(true)
        return true
      }

      // Intentar desencriptar la primera cuenta para verificar la contraseña
      const testAccount = encryptedAccounts[0]
      try {
        await decrypt(testAccount.encryptedData, password)
      } catch {
        return false // Contraseña incorrecta
      }

      // Desencriptar y cargar todas las cuentas
      console.log(`[Keyring] 📦 Cargando ${encryptedAccounts.length} cuenta(s) desde IndexedDB...`)
      const loadedAccounts: KeyringAccount[] = []
      const failedAccounts: Array<{ address: string; error: any }> = []
      
      for (const encAccount of encryptedAccounts) {
        try {
          const decryptedData = await decrypt(encAccount.encryptedData, password)
          const parsed = JSON.parse(decryptedData)
          
          // Verificar si es una cuenta de Polkadot.js
          if (parsed.isPolkadotJson && parsed.jsonData && parsed.jsonPassword) {
            // Es una cuenta importada desde Polkadot.js
            // Usar addFromJson con el JSON y su contraseña
            const pair = keyring.addFromJson(parsed.jsonData, parsed.jsonPassword)
            
            // Verificar que la dirección coincida
            if (pair.address !== encAccount.address) {
              console.warn(`[Keyring] ⚠️ Dirección no coincide: esperada ${encAccount.address}, obtenida ${pair.address}`)
            }
            
            // Asegurar que el pair esté desbloqueado
            if (pair.isLocked) {
              console.log(`[Keyring] 🔓 Desbloqueando pair al cargar: ${pair.address}`)
              pair.unlock(parsed.jsonPassword)
              if (pair.isLocked) {
                console.error(`[Keyring] ❌ No se pudo desbloquear el pair: ${pair.address}`)
                failedAccounts.push({ 
                  address: encAccount.address, 
                  error: new Error('No se pudo desbloquear el pair') 
                })
                continue
              }
            }
            
            loadedAccounts.push({
              pair,
              address: pair.address,
              publicKey: pair.publicKey,
              meta: pair.meta,
            })
            console.log(`[Keyring] ✅ Cuenta de Polkadot.js cargada y desbloqueada: ${pair.address}`)
          } else {
            // Es una cuenta normal (mnemonic/uri)
            const { uri, mnemonic, type } = parsed
            
            // Usar uri si está disponible, sino mnemonic
            const seed = uri || mnemonic
            if (!seed) {
              const error = new Error('No tiene uri ni mnemonic')
              console.error(`[Keyring] ❌ Cuenta ${encAccount.address}: ${error.message}`)
              failedAccounts.push({ address: encAccount.address, error })
              continue
            }
            
            // Agregar al keyring
            const pair = keyring.addFromUri(seed, encAccount.meta, type || 'sr25519')
            
            // Verificar que la dirección coincida
            if (pair.address !== encAccount.address) {
              console.warn(`[Keyring] ⚠️ Dirección no coincide: esperada ${encAccount.address}, obtenida ${pair.address}`)
            }
            
            loadedAccounts.push({
              pair,
              address: pair.address,
              publicKey: pair.publicKey,
              meta: pair.meta,
            })
            console.log(`[Keyring] ✅ Cuenta cargada: ${pair.address} (tipo: ${type || 'sr25519'})`)
          }
        } catch (error) {
          console.error(`[Keyring] ❌ Error al cargar cuenta ${encAccount.address}:`, error)
          failedAccounts.push({ address: encAccount.address, error })
        }
      }

      // Resumen de carga
      console.log(`[Keyring] 📊 Resumen de carga:`)
      console.log(`  ✅ Cargadas exitosamente: ${loadedAccounts.length}`)
      console.log(`  ❌ Fallidas: ${failedAccounts.length}`)
      
      if (failedAccounts.length > 0) {
        console.warn(`[Keyring] ⚠️ Las siguientes cuentas no se pudieron cargar:`, failedAccounts)
      }

      // Verificar sincronización con keyring
      const keyringPairs = keyring.getPairs()
      console.log(`[Keyring] 🔍 Verificación de sincronización:`)
      console.log(`  Keyring tiene ${keyringPairs.length} par(es)`)
      console.log(`  Estado React tiene ${loadedAccounts.length} cuenta(s)`)
      
      if (keyringPairs.length !== loadedAccounts.length) {
        console.warn(`[Keyring] ⚠️ Desincronización detectada entre keyring y estado React`)
      }

      setAccounts(loadedAccounts)
      setIsUnlocked(true)
      return true
    } catch (error) {
      console.error('Error al desbloquear keyring:', error)
      return false
    }
  }, [keyring])

  /**
   * Desbloquea el keyring usando WebAuthn
   * Deriva una clave maestra desde la firma WebAuthn y la usa para desencriptar las cuentas
   */
  const unlockWithWebAuthn = useCallback(async (credentialId: string): Promise<boolean> => {
    if (!keyring) return false

    try {
      const encryptedAccounts = await getAllEncryptedAccounts()
      
      if (encryptedAccounts.length === 0) {
        setIsUnlocked(true)
        return true
      }

      // Obtener la credencial WebAuthn
      const credential = await getWebAuthnCredential(credentialId)
      if (!credential) {
        console.error('[Keyring] Credencial WebAuthn no encontrada')
        return false
      }

      // Autenticar con WebAuthn (esto verifica la identidad del usuario)
      const authResult = await authenticateWithWebAuthn(credentialId)
      
      // Actualizar el uso de la credencial
      await updateWebAuthnCredentialUsage(credentialId)
      
      console.log('[Keyring] ✅ Autenticación WebAuthn exitosa')
      
      // Obtener o generar el salt para la clave maestra
      let masterKeySalt: Uint8Array
      if (credential.masterKeySalt) {
        // Convertir salt de base64url a Uint8Array
        const { base64UrlToArrayBuffer } = await import('@/utils/webauthn')
        const saltBuffer = base64UrlToArrayBuffer(credential.masterKeySalt)
        masterKeySalt = new Uint8Array(saltBuffer)
      } else {
        // Si no hay salt, generar uno nuevo y guardarlo
        const { generateMasterKeySalt, arrayBufferToBase64Url } = await import('@/utils/webauthn')
        const { saveWebAuthnCredential } = await import('@/utils/webauthnStorage')
        masterKeySalt = generateMasterKeySalt()
        credential.masterKeySalt = arrayBufferToBase64Url(masterKeySalt.buffer)
        await saveWebAuthnCredential(credential)
        console.log('[Keyring] ✅ Salt de clave maestra generado y guardado')
      }

      // Derivar la clave maestra desde WebAuthn
      const { deriveKeyFromWebAuthn } = await import('@/utils/webauthn')
      const masterKey = await deriveKeyFromWebAuthn(
        authResult.signature,
        authResult.authenticatorData,
        masterKeySalt
      )
      
      console.log('[Keyring] ✅ Clave maestra derivada desde WebAuthn')

      // Desencriptar y cargar todas las cuentas usando la clave maestra
      const { decryptWithKey } = await import('@/utils/encryption')
      const loadedAccounts: KeyringAccount[] = []
      
      for (const encAccount of encryptedAccounts) {
        try {
          // Intentar desencriptar con la clave maestra de WebAuthn
          const decryptedData = await decryptWithKey(encAccount.encryptedData, masterKey)
          const { uri, mnemonic, type } = JSON.parse(decryptedData)
          
          // Usar uri si está disponible, sino mnemonic
          const seed = uri || mnemonic
          if (!seed) {
            console.error(`[Keyring] ❌ Cuenta ${encAccount.address} no tiene uri ni mnemonic`)
            continue
          }
          
          const pair = keyring.addFromUri(seed, encAccount.meta, type || 'sr25519')
          loadedAccounts.push({
            pair,
            address: pair.address,
            publicKey: pair.publicKey,
            meta: pair.meta,
          })
          console.log(`[Keyring] ✅ Cuenta cargada: ${pair.address}`)
        } catch (error) {
          // Si falla, la cuenta puede estar encriptada con contraseña, no con WebAuthn
          console.warn(`[Keyring] ⚠️ No se pudo desencriptar cuenta ${encAccount.address} con WebAuthn:`, error)
          // Continuar con otras cuentas
        }
      }

      if (loadedAccounts.length === 0) {
        console.warn('[Keyring] ⚠️ No se pudieron cargar cuentas con WebAuthn. Puede que estén encriptadas con contraseña.')
        // Aún así marcamos como desbloqueado para permitir crear nuevas cuentas
        setIsUnlocked(true)
        return true
      }

      console.log(`[Keyring] ✅ ${loadedAccounts.length} cuenta(s) cargada(s) exitosamente con WebAuthn`)
      setAccounts(loadedAccounts)
      setIsUnlocked(true)
      return true
    } catch (error) {
      console.error('[Keyring] ❌ Error al desbloquear con WebAuthn:', error)
      return false
    }
  }, [keyring])

  /**
   * Bloquea el keyring, eliminando las claves de memoria
   */
  const lock = useCallback(() => {
    if (!keyring) return
    
    // Remover todos los pares del keyring
    accounts.forEach(acc => {
      try {
        keyring.removePair(acc.address)
      } catch {}
    })
    
    setAccounts([])
    setIsUnlocked(false)
  }, [keyring, accounts])

  const addFromMnemonic = useCallback(async (mnemonic: string, name?: string, type: 'sr25519' | 'ed25519' | 'ecdsa' = 'sr25519', password?: string): Promise<KeyringAccount | null> => {
    if (!keyring) {
      console.error('[Keyring] ❌ No se puede agregar cuenta: keyring no inicializado')
      return null
    }

    // Verificar directamente en IndexedDB si hay cuentas almacenadas
    // (más confiable que el estado React que puede no estar actualizado)
    const encryptedAccounts = await getAllEncryptedAccounts()
    const hasStored = encryptedAccounts.length > 0

    // Permitir agregar cuenta si:
    // 1. No hay cuentas almacenadas (primera vez) - no requiere desbloqueo
    // 2. O si está desbloqueado (cuentas existentes)
    if (!isUnlocked && hasStored) {
      console.error('[Keyring] ❌ No se puede agregar cuenta: keyring no desbloqueado')
      return null
    }

    // Si no hay cuentas almacenadas, marcar como desbloqueado para permitir la creación
    if (!hasStored && !isUnlocked) {
      console.log('[Keyring] Primera cuenta: marcando keyring como desbloqueado')
      setIsUnlocked(true)
    }

    try {
      // 1. Agregar al keyring
      const pair = keyring.addFromUri(mnemonic, { name: name || 'Account' }, type)
      console.log(`[Keyring] ✅ Cuenta agregada al keyring: ${pair.address}`)
      
      const account: KeyringAccount = {
        pair,
        address: pair.address,
        publicKey: pair.publicKey,
        meta: pair.meta,
      }

      // 2. Actualizar estado React
      setAccounts((prev) => {
        const updated = [...prev, account]
        console.log(`[Keyring] 📊 Total de cuentas en estado React: ${updated.length}`)
        return updated
      })

      // 3. Guardar encriptado en IndexedDB (requiere contraseña)
      if (password) {
        try {
          const encryptedData = await encrypt(JSON.stringify({ mnemonic, uri: null, type }), password)
          await saveEncryptedAccount({
            address: account.address,
            encryptedData,
            publicKey: u8aToHex(account.publicKey),
            type,
            meta: account.meta,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          console.log(`[Keyring] ✅ Cuenta guardada en IndexedDB: ${account.address}`)
          
          // Actualizar hasStoredAccounts después de guardar
          setHasStoredAccounts(true)
        } catch (error) {
          console.error('[Keyring] ❌ Error al guardar cuenta encriptada:', error)
          // Remover del keyring si falla el guardado
          try {
            keyring.removePair(account.address)
            setAccounts((prev) => prev.filter(acc => acc.address !== account.address))
          } catch {}
          throw error
        }
      } else {
        console.warn(`[Keyring] ⚠️ Cuenta ${account.address} agregada al keyring pero NO guardada en IndexedDB (sin contraseña). Se perderá al bloquear el keyring.`)
      }

      return account
    } catch (error) {
      console.error('[Keyring] ❌ Error al agregar cuenta desde mnemonic:', error)
      throw error
    }
  }, [keyring, isUnlocked, hasStoredAccounts])

  /**
   * Importa una cuenta desde un archivo JSON de Polkadot.js
   * @param jsonData Objeto JSON con el formato de Polkadot.js
   * @param jsonPassword Contraseña para desencriptar el JSON
   * @param password Contraseña opcional para encriptar en nuestro sistema
   */
  const addFromJson = useCallback(async (
    jsonData: object,
    jsonPassword: string,
    password?: string
  ): Promise<KeyringAccount | null> => {
    if (!keyring) {
      console.error('[Keyring] ❌ No se puede agregar cuenta: keyring no inicializado')
      return null
    }

    // Verificar directamente en IndexedDB si hay cuentas almacenadas
    const encryptedAccounts = await getAllEncryptedAccounts()
    const hasStored = encryptedAccounts.length > 0

    // Permitir agregar cuenta si:
    // 1. No hay cuentas almacenadas (primera vez) - no requiere desbloqueo
    // 2. O si está desbloqueado (cuentas existentes)
    if (!isUnlocked && hasStored) {
      console.error('[Keyring] ❌ No se puede agregar cuenta: keyring no desbloqueado')
      return null
    }

    // Si no hay cuentas almacenadas, marcar como desbloqueado
    if (!hasStored && !isUnlocked) {
      console.log('[Keyring] Primera cuenta: marcando keyring como desbloqueado')
      setIsUnlocked(true)
    }

    try {
      // Validar formato JSON de Polkadot.js
      if (!('address' in jsonData) || !('encoded' in jsonData)) {
        throw new Error('El JSON no tiene el formato correcto de Polkadot.js (falta address o encoded)')
      }

      // Agregar al keyring usando el método de Polkadot.js
      const pair = keyring.addFromJson(jsonData as any, jsonPassword)
      console.log(`[Keyring] ✅ Cuenta agregada al keyring desde JSON: ${pair.address}`)
      
      // Verificar si el pair está bloqueado y desbloquearlo si es necesario
      // En Polkadot.js, addFromJson puede dejar el pair bloqueado si el JSON está encriptado
      if (pair.isLocked) {
        console.log(`[Keyring] 🔓 Desbloqueando pair: ${pair.address}`)
        pair.unlock(jsonPassword)
        if (pair.isLocked) {
          console.warn(`[Keyring] ⚠️ No se pudo desbloquear el pair: ${pair.address}`)
        } else {
          console.log(`[Keyring] ✅ Pair desbloqueado: ${pair.address}`)
        }
      }

      const account: KeyringAccount = {
        pair,
        address: pair.address,
        publicKey: pair.publicKey,
        meta: pair.meta,
      }

      // Actualizar estado React
      setAccounts((prev) => {
        const updated = [...prev, account]
        console.log(`[Keyring] 📊 Total de cuentas en estado React: ${updated.length}`)
        return updated
      })

      // Guardar encriptado en IndexedDB
      // Para JSON de Polkadot.js, guardamos el JSON original y la contraseña del JSON (ambos encriptados)
      // La contraseña del JSON se necesita para desbloquear la cuenta al desbloquear el wallet
      if (password) {
        try {
          // Extraer el tipo del encoding
          const cryptoType = (jsonData as any).encoding?.content?.[1] || 'sr25519'
          
          // Guardar el JSON original y la contraseña del JSON, ambos encriptados con nuestra contraseña
          // Esto permite desbloquear la cuenta sin pedir la contraseña del JSON cada vez
          const dataToEncrypt = JSON.stringify({ 
            jsonData, 
            isPolkadotJson: true,
            jsonPassword: jsonPassword // Guardar la contraseña del JSON encriptada
          })
          console.log(`[Keyring] 🔐 Encriptando datos para guardar en IndexedDB...`)
          const encryptedData = await encrypt(dataToEncrypt, password)
          
          const accountToSave = {
            address: account.address,
            encryptedData,
            publicKey: u8aToHex(account.publicKey),
            type: cryptoType,
            meta: account.meta,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }
          
          console.log(`[Keyring] 💾 Guardando cuenta en IndexedDB: ${account.address}`)
          await saveEncryptedAccount(accountToSave)
          
          // Verificar que la cuenta se guardó correctamente
          const savedAccounts = await getAllEncryptedAccounts()
          const wasSaved = savedAccounts.some(acc => acc.address === account.address)
          
          if (wasSaved) {
            console.log(`[Keyring] ✅ Cuenta guardada y verificada en IndexedDB: ${account.address}`)
            setHasStoredAccounts(true)
          } else {
            console.error(`[Keyring] ❌ Cuenta NO encontrada en IndexedDB después de guardar: ${account.address}`)
            throw new Error('La cuenta no se guardó correctamente en IndexedDB')
          }
        } catch (error) {
          console.error('[Keyring] ❌ Error al guardar cuenta encriptada:', error)
          // Remover del keyring si falla el guardado
          try {
            keyring.removePair(account.address)
            setAccounts((prev) => prev.filter(acc => acc.address !== account.address))
          } catch {}
          throw error
        }
      } else {
        console.warn(`[Keyring] ⚠️ Cuenta ${account.address} agregada al keyring pero NO guardada en IndexedDB (sin contraseña). Se perderá al bloquear el keyring.`)
      }

      return account
    } catch (error) {
      console.error('[Keyring] ❌ Error al agregar cuenta desde JSON:', error)
      throw error
    }
  }, [keyring, isUnlocked, hasStoredAccounts])

  const addFromUri = useCallback(async (uri: string, name?: string, type: 'sr25519' | 'ed25519' | 'ecdsa' = 'sr25519', password?: string): Promise<KeyringAccount | null> => {
    if (!keyring || !isUnlocked) {
      console.error('[Keyring] ❌ No se puede agregar cuenta: keyring no inicializado o no desbloqueado')
      return null
    }

    try {
      // 1. Agregar al keyring
      const pair = keyring.addFromUri(uri, { name: name || 'Account' }, type)
      console.log(`[Keyring] ✅ Cuenta agregada al keyring: ${pair.address}`)
      
      const account: KeyringAccount = {
        pair,
        address: pair.address,
        publicKey: pair.publicKey,
        meta: pair.meta,
      }

      // 2. Actualizar estado React
      setAccounts((prev) => {
        const updated = [...prev, account]
        console.log(`[Keyring] 📊 Total de cuentas en estado React: ${updated.length}`)
        return updated
      })

      // 3. Guardar encriptado en IndexedDB (requiere contraseña)
      if (password) {
        try {
          const encryptedData = await encrypt(JSON.stringify({ uri, mnemonic: null, type }), password)
          await saveEncryptedAccount({
            address: account.address,
            encryptedData,
            publicKey: u8aToHex(account.publicKey),
            type,
            meta: account.meta,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          })
          console.log(`[Keyring] ✅ Cuenta guardada en IndexedDB: ${account.address}`)
          
          // Actualizar hasStoredAccounts después de guardar
          setHasStoredAccounts(true)
        } catch (error) {
          console.error('[Keyring] ❌ Error al guardar cuenta encriptada:', error)
          // Remover del keyring si falla el guardado
          try {
            keyring.removePair(account.address)
            setAccounts((prev) => prev.filter(acc => acc.address !== account.address))
          } catch {}
          throw error
        }
      } else {
        console.warn(`[Keyring] ⚠️ Cuenta ${account.address} agregada al keyring pero NO guardada en IndexedDB (sin contraseña). Se perderá al bloquear el keyring.`)
      }

      return account
    } catch (error) {
      console.error('[Keyring] ❌ Error al agregar cuenta desde URI:', error)
      throw error
    }
  }, [keyring, isUnlocked])

  const removeAccount = useCallback(async (address: string) => {
    if (!keyring) return false

    try {
      keyring.removePair(address)
      setAccounts((prev) => prev.filter((acc) => acc.address !== address))
      
      // Eliminar de IndexedDB
      await deleteEncryptedAccount(address)
      
      // Actualizar hasStoredAccounts
      const remaining = await getAllEncryptedAccounts()
      setHasStoredAccounts(remaining.length > 0)
      
      return true
    } catch (error) {
      console.error('Error al eliminar cuenta:', error)
      return false
    }
  }, [keyring])

  const getAccount = useCallback((address: string) => {
    return accounts.find((acc) => acc.address === address)
  }, [accounts])

  const setSS58Format = useCallback((format: number) => {
    if (!keyring) return
    keyring.setSS58Format(format)
    // Actualizar direcciones de todas las cuentas
    setAccounts((prev) => prev.map((acc) => ({
      ...acc,
      address: acc.pair.address,
    })))
  }, [keyring])

  return {
    keyring,
    isReady,
    accounts,
    isUnlocked,
    hasStoredAccounts,
    hasWebAuthnCredentials,
    generateMnemonic,
    unlock,
    unlockWithWebAuthn,
    lock,
    addFromMnemonic,
    addFromUri,
    addFromJson,
    removeAccount,
    getAccount,
    setSS58Format,
    refreshWebAuthnCredentials: checkWebAuthnCredentials,
    refreshStoredAccounts: checkStoredAccounts,
  }
}

