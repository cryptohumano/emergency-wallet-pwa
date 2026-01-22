import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { useI18n } from '@/contexts/I18nContext'
import { Lock, Fingerprint, Eye, EyeOff, Info, X } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Unlock() {
  const { unlock, unlockWithWebAuthn, hasWebAuthnCredentials, accounts: webauthnAccounts } = useKeyringContext()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showInfoAlert, setShowInfoAlert] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const handleUnlock = async () => {
    setError('')
    if (!password) {
      setError(t('unlock.enterPasswordError'))
      return
    }

    setLoading(true)
    try {
      const success = await unlock(password)
      if (!success) {
        setError(t('unlock.wrongPassword'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unlock.unlockError'))
    } finally {
      setLoading(false)
    }
  }

  const handleUnlockWithWebAuthn = async () => {
    setError('')
    setLoading(true)
    try {
      // Obtener la primera credencial WebAuthn disponible
      const credentials = await import('@/utils/webauthnStorage').then(m => m.getAllWebAuthnCredentials())
      if (credentials.length === 0) {
        setError(t('unlock.noWebAuthnCredentials'))
        setLoading(false)
        return
      }

      const success = await unlockWithWebAuthn(credentials[0].id)
      if (!success) {
        setError(t('unlock.webauthnError'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unlock.webauthnUnlockError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      {/* Botón de información fuera de la card */}
      <div className="fixed top-4 right-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowInfoAlert(!showInfoAlert)}
          className="rounded-full shadow-lg"
          aria-label={t('unlock.showInfo')}
        >
          {showInfoAlert ? (
            <X className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Alert colapsable fuera de la card */}
      {showInfoAlert && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto sm:max-w-md z-10 animate-in slide-in-from-top-2">
          <Alert className="shadow-2xl">
            <AlertDescription className="text-sm">
              <strong>{t('unlock.note')}:</strong> {t('unlock.backupNote')}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Logo de la PWA */}
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {!logoError ? (
              <img 
                src="/web-app-manifest-192x192.png" 
                alt="Emergency Wallet Logo" 
                className="w-full h-full object-cover"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">{t('unlock.title')}</CardTitle>
          <CardDescription>
            {t('unlock.description')}
            {hasWebAuthnCredentials && ` ${t('unlock.webauthn')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="password" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password">{t('unlock.passwordTab')}</TabsTrigger>
              {hasWebAuthnCredentials && (
                <TabsTrigger value="webauthn">{t('unlock.webauthnTab')}</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="password" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('unlock.passwordLabel')}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnlock()
                      }
                    }}
                    placeholder={t('unlock.enterPasswordPlaceholder')}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleUnlock}
                className="w-full"
                disabled={loading || !password}
              >
                {loading ? t('unlock.unlocking') : t('unlock.unlock')}
              </Button>
            </TabsContent>

            {hasWebAuthnCredentials && (
              <TabsContent value="webauthn" className="space-y-4">
                <div className="text-center py-4">
                  <Fingerprint className="h-12 w-12 mx-auto mb-4 text-primary" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('unlock.webauthnDescription')}
                  </p>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  onClick={handleUnlockWithWebAuthn}
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? t('unlock.authenticating') : t('unlock.webauthn')}
                </Button>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

