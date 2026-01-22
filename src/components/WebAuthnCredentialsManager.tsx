import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, Shield, AlertCircle, CheckCircle, Fingerprint, Plus } from 'lucide-react'
import { getAllWebAuthnCredentials, deleteWebAuthnCredential, saveWebAuthnCredential } from '@/utils/webauthnStorage'
import { 
  isWebAuthnAvailable, 
  isBiometricAvailable, 
  registerWebAuthnCredential 
} from '@/utils/webauthn'
import { useKeyringContext } from '@/contexts/KeyringContext'
import type { WebAuthnCredential } from '@/utils/webauthn'
import { useI18n } from '@/contexts/I18nContext'

export function WebAuthnCredentialsManager() {
  const { t } = useI18n()
  const { refreshWebAuthnCredentials } = useKeyringContext()
  const [credentials, setCredentials] = useState<WebAuthnCredential[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [isBiometricSupported, setIsBiometricSupported] = useState(false)
  const [credentialName, setCredentialName] = useState('')
  const [userName, setUserName] = useState('Usuario')

  const loadCredentials = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const creds = await getAllWebAuthnCredentials()
      setCredentials(creds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar credenciales')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const checkAvailability = async () => {
      const available = isWebAuthnAvailable()
      setIsAvailable(available)
      
      if (available) {
        const biometric = await isBiometricAvailable()
        setIsBiometricSupported(biometric)
      }
      
      await loadCredentials()
    }
    
    checkAvailability()
  }, [])

  const handleDelete = async (credentialId: string, credentialName?: string) => {
    if (!confirm(`¿Estás seguro de eliminar la credencial "${credentialName || credentialId}"?`)) {
      return
    }

    setDeletingId(credentialId)
    setError(null)
    setSuccess(null)

    try {
      await deleteWebAuthnCredential(credentialId)
      await loadCredentials()
      
      // Actualizar el estado del keyring
      await refreshWebAuthnCredentials()
      
      setSuccess('Credencial eliminada exitosamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la credencial')
    } finally {
      setDeletingId(null)
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    }
  }

  const handleRegister = async () => {
    if (!isAvailable) {
      setError(t('webauthn.notAvailableError'))
      return
    }

    setIsRegistering(true)
    setError(null)
    setSuccess(null)

    try {
      // Generar un ID único para el usuario
      const userId = crypto.getRandomValues(new Uint8Array(16))
      const userIdHex = Array.from(userId)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const defaultUser = t('webauthn.userNamePlaceholder')
      const credential = await registerWebAuthnCredential(
        userIdHex,
        userName || defaultUser,
        userName || `Usuario de Emergency Wallet`,
        credentialName || undefined
      )

      await saveWebAuthnCredential(credential)
      await loadCredentials()
      
      // Actualizar el estado del keyring
      await refreshWebAuthnCredentials()
      
      setSuccess(t('webauthn.registerSuccess'))
      setCredentialName('')
      setUserName(defaultUser)
    } catch (err: any) {
      setError(err.message || t('webauthn.registerError'))
    } finally {
      setIsRegistering(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  if (!isAvailable) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('webauthn.notAvailable')}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('webauthn.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('webauthn.description')}
          </p>
        </div>
        <Button variant="outline" onClick={loadCredentials} disabled={isLoading}>
          {isLoading ? t('webauthn.loading') : t('webauthn.refresh')}
        </Button>
      </div>

      {isBiometricSupported && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t('webauthn.biometricSupported')}
          </AlertDescription>
        </Alert>
      )}

      {/* Formulario para registrar nueva credencial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('webauthn.registerTitle')}
          </CardTitle>
          <CardDescription>
            {t('webauthn.registerDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">{t('webauthn.userName')}</Label>
            <Input
              id="userName"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t('webauthn.userNamePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credentialName">{t('webauthn.credentialName')}</Label>
            <Input
              id="credentialName"
              value={credentialName}
              onChange={(e) => setCredentialName(e.target.value)}
              placeholder={t('webauthn.credentialNamePlaceholder')}
            />
            <p className="text-xs text-muted-foreground">
              {t('webauthn.credentialNameHelp')}
            </p>
          </div>
          <Button
            onClick={handleRegister}
            disabled={isRegistering}
            className="w-full"
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            {isRegistering ? t('webauthn.registering') : t('webauthn.register')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t('webauthn.registerHelp')}
          </p>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{t('webauthn.loadingCredentials')}</p>
        </div>
      ) : credentials.length === 0 ? (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {t('webauthn.noCredentials')}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-3">
          {credentials.map((credential) => (
            <Card key={credential.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">
                        {credential.name || t('webauthn.unnamedCredential')}
                      </h4>
                      <Badge variant="outline">WebAuthn</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>
                        <strong>{t('webauthn.id')}:</strong> {credential.id.substring(0, 20)}...
                      </p>
                      <p>
                        <strong>{t('webauthn.created')}:</strong> {formatDate(credential.createdAt)}
                      </p>
                      {credential.lastUsedAt && (
                        <p>
                          <strong>{t('webauthn.lastUsed')}:</strong> {formatDate(credential.lastUsedAt)}
                        </p>
                      )}
                      <p>
                        <strong>{t('webauthn.uses')}:</strong> {credential.counter}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(credential.id, credential.name)}
                    disabled={deletingId === credential.id}
                  >
                    {deletingId === credential.id ? (
                      t('webauthn.deleting')
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('webauthn.delete')}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          {t('webauthn.note')}
        </AlertDescription>
      </Alert>
    </div>
  )
}

