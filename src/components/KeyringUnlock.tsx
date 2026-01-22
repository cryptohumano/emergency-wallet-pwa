import { useState, useEffect } from 'react'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, Unlock, AlertCircle, Fingerprint } from 'lucide-react'
import { getAllWebAuthnCredentials } from '@/utils/webauthnStorage'
import type { WebAuthnCredential } from '@/utils/webauthn'
import { useI18n } from '@/contexts/I18nContext'

export function KeyringUnlock() {
  const { t } = useI18n()
  const { isUnlocked, hasStoredAccounts, hasWebAuthnCredentials, unlock, unlockWithWebAuthn, lock, isReady } = useKeyringContext()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [webauthnCredentials, setWebauthnCredentials] = useState<WebAuthnCredential[]>([])
  const [isWebAuthnLoading, setIsWebAuthnLoading] = useState(false)

  // Cargar credenciales al montar el componente
  useEffect(() => {
    loadWebAuthnCredentials()
  }, [])
  
  // También cargar cuando cambie el estado del contexto
  useEffect(() => {
    if (hasWebAuthnCredentials) {
      loadWebAuthnCredentials()
    }
  }, [hasWebAuthnCredentials])

  const loadWebAuthnCredentials = async () => {
    try {
      const creds = await getAllWebAuthnCredentials()
      console.log('[KeyringUnlock] Credenciales WebAuthn cargadas:', creds.length)
      setWebauthnCredentials(creds)
    } catch (err) {
      console.error('[KeyringUnlock] Error al cargar credenciales WebAuthn:', err)
      setWebauthnCredentials([])
    }
  }

  const handleWebAuthnUnlock = async (credentialId: string) => {
    setIsWebAuthnLoading(true)
    setError(null)

    try {
      const success = await unlockWithWebAuthn(credentialId)
      if (!success) {
        setError(t('keyring.webauthnError'))
      }
    } catch (err: any) {
      setError(err.message || t('keyring.webauthnUnlockError'))
    } finally {
      setIsWebAuthnLoading(false)
    }
  }

  // Si el keyring no está listo, mostrar un mensaje
  if (!isReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('keyring.status')}
          </CardTitle>
          <CardDescription>
            {t('keyring.initializing')}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const handleUnlock = async () => {
    if (!password.trim()) {
      setError(t('keyring.enterPassword'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const success = await unlock(password)
      if (!success) {
        setError(t('keyring.wrongPassword'))
        setPassword('')
      } else {
        setPassword('')
      }
    } catch (err: any) {
      setError(err.message || t('keyring.unlockError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleLock = () => {
    lock()
    setPassword('')
    setError(null)
  }

  if (isUnlocked) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-green-600" />
            {t('keyring.unlocked')}
          </CardTitle>
          <CardDescription>
            {t('keyring.unlockedDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleLock} variant="outline" className="w-full">
            <Lock className="h-4 w-4 mr-2" />
            {t('keyring.lock')}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            {t('keyring.lockNote')}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!hasStoredAccounts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('keyring.status')}
          </CardTitle>
          <CardDescription>
            {t('keyring.noAccounts')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={t('keyring.passwordAnyPlaceholder')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleUnlock()
                }
              }}
              disabled={isLoading}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          <Button 
            onClick={handleUnlock} 
            disabled={isLoading || !password.trim()} 
            className="w-full"
          >
            {isLoading ? t('keyring.unlocking') : t('keyring.unlockToCreate')}
          </Button>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">
              {t('keyring.noAccountsNote')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-yellow-200 dark:border-yellow-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {t('keyring.unlock')}
        </CardTitle>
        <CardDescription>
          {webauthnCredentials.length > 0 
            ? t('keyring.unlockWithBiometric')
            : t('keyring.unlockWithPasswordDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mostrar WebAuthn primero si hay credenciales disponibles */}
        {webauthnCredentials.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              {t('keyring.biometricAuth')}
            </div>
            {webauthnCredentials.map((credential) => (
              <Button
                key={credential.id}
                onClick={() => handleWebAuthnUnlock(credential.id)}
                disabled={isWebAuthnLoading || isLoading}
                variant="outline"
                className="w-full"
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                {isWebAuthnLoading ? t('keyring.authenticating') : `${t('keyring.unlockWith')} ${credential.name || 'WebAuthn'}`}
              </Button>
            ))}
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">{t('keyring.or')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Opción con contraseña */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            {webauthnCredentials.length > 0 ? t('keyring.password') : t('keyring.unlockWithPassword')}
          </div>
          <Input
            type="password"
            placeholder={t('keyring.passwordPlaceholder')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUnlock()
              }
            }}
            disabled={isLoading || isWebAuthnLoading}
          />
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          <Button 
            onClick={handleUnlock} 
            disabled={isLoading || isWebAuthnLoading || !password.trim()} 
            className="w-full"
          >
            {isLoading ? t('keyring.unlocking') : t('keyring.unlockWithPassword')}
          </Button>
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            {t('keyring.securityNote')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

