import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { useI18n } from '@/contexts/I18nContext'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

type CryptoType = 'sr25519' | 'ed25519' | 'ecdsa'

export default function CreateAccount() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const { generateMnemonic, addFromMnemonic, isUnlocked } = useKeyringContext()
  const [step, setStep] = useState<'form' | 'backup' | 'password'>('form')
  const [name, setName] = useState('')
  const [type, setType] = useState<CryptoType>('sr25519')
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isUnlocked) {
    navigate('/')
    return null
  }

  const handleGenerate = () => {
    const newMnemonic = generateMnemonic()
    setMnemonic(newMnemonic)
    setStep('backup')
  }

  const handleCopyMnemonic = async () => {
    await navigator.clipboard.writeText(mnemonic)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBackupConfirmed = () => {
    setStep('password')
  }

  const handleCreate = async () => {
    setError('')

    if (!name.trim()) {
      setError(t('accounts.nameRequired'))
      return
    }

    if (!password) {
      setError(t('accounts.passwordRequired'))
      return
    }

    if (password.length < 8) {
      setError(t('accounts.passwordMin'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('accounts.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const account = await addFromMnemonic(mnemonic, name, type, password)
      if (account) {
        navigate('/accounts')
      } else {
        setError(t('accounts.createError'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('accounts.createError'))
    } finally {
      setLoading(false)
    }
  }

  if (step === 'form') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('accounts.createNew')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('accounts.generateDescription')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('accounts.accountConfig')}</CardTitle>
            <CardDescription>
              {t('accounts.configDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">{t('accounts.accountName')}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('accounts.myAccount')}
              />
            </div>

            <div className="space-y-3">
              <Label>Tipo de Criptografía</Label>
              <RadioGroup value={type} onValueChange={(v) => setType(v as CryptoType)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sr25519" id="sr25519" />
                  <Label htmlFor="sr25519" className="font-normal cursor-pointer">
                    sr25519 (Schnorrkel) - Recomendado para Substrate
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ed25519" id="ed25519" />
                  <Label htmlFor="ed25519" className="font-normal cursor-pointer">
                    ed25519 (Edwards) - Alternativa común
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ecdsa" id="ecdsa" />
                  <Label htmlFor="ecdsa" className="font-normal cursor-pointer">
                    ecdsa - Compatible con Ethereum
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleGenerate} className="w-full" size="lg">
              Generar Nueva Cuenta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'backup') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('form')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('accounts.saveRecovery')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('accounts.saveRecoveryDesc')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('accounts.recoveryMnemonic')}</CardTitle>
            <CardDescription>
              {t('accounts.recoveryMnemonicDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-6 bg-muted rounded-lg border-2 border-dashed">
              {showMnemonic ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {mnemonic.split(' ').map((word, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-muted-foreground w-6">{index + 1}.</span>
                        <span className="font-mono">{word}</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleCopyMnemonic}
                    variant="outline"
                    className="w-full"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copiar al Portapapeles
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={() => setShowMnemonic(true)} variant="outline" size="lg">
                    {t('onboarding.showPhrase')}
                  </Button>
                </div>
              )}
            </div>

            {showMnemonic && (
              <Alert>
                <AlertDescription>
                  <strong>⚠️ {t('common.warning')}:</strong> {t('onboarding.neverShare')}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setStep('form')}
                variant="outline"
                className="flex-1"
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={handleBackupConfirmed}
                className="flex-1"
                disabled={!showMnemonic}
              >
                {t('onboarding.savedPhrase')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'password') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep('backup')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('onboarding.passwordSetup')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('onboarding.passwordDesc')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('accounts.securityPassword')}</CardTitle>
            <CardDescription>
              {t('accounts.securityPasswordDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('onboarding.password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('onboarding.minPassword')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('onboarding.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('accounts.repeatPassword')}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setStep('backup')}
                variant="outline"
                className="flex-1"
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={handleCreate}
                className="flex-1"
                disabled={loading || !password || !confirmPassword}
              >
                {loading ? t('accounts.creating') : t('accounts.create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

