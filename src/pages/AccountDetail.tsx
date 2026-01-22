import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { useMultiChainBalances } from '@/hooks/useMultiChainBalances'
import { useI18n } from '@/contexts/I18nContext'
import { formatBalanceForDisplay, getChainSymbol } from '@/utils/balance'
import Identicon from '@polkadot/react-identicon'
import { Avatar } from '@/components/ui/avatar'
import { 
  Copy, 
  Check, 
  ArrowLeft, 
  Send, 
  Download, 
  Trash2, 
  ExternalLink,
  RefreshCw,
  Key,
  Calendar,
  Shield,
  Wallet
} from 'lucide-react'
import { getEncryptedAccount } from '@/utils/secureStorage'
import type { EncryptedAccount } from '@/utils/secureStorage'

export default function AccountDetail() {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const { t, language } = useI18n()
  const { getAccount, removeAccount } = useKeyringContext()
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [accountDetails, setAccountDetails] = useState<EncryptedAccount | null>(null)

  const account = address ? getAccount(address) : null
  const { balances, isLoading: isLoadingBalances, error: balanceError, lastUpdate } = useMultiChainBalances(
    address || null
  )

  // Cargar detalles de la cuenta desde IndexedDB
  useEffect(() => {
    if (!address) return

    const loadAccountDetails = async () => {
      try {
        const details = await getEncryptedAccount(address)
        setAccountDetails(details)
      } catch (error) {
        console.error('Error al cargar detalles de la cuenta:', error)
      }
    }

    loadAccountDetails()
  }, [address])

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  const handleDeleteAccount = async () => {
    if (!address) return
    
    if (window.confirm(t('accounts.deleteConfirm'))) {
      const success = await removeAccount(address)
      if (success) {
        navigate('/accounts')
      }
    }
  }

  if (!address) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{t('accounts.invalidAddress')}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('accounts.backToAccounts')}
          </Link>
        </Button>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>{t('accounts.notFound')}</AlertDescription>
        </Alert>
        <Button asChild variant="outline">
          <Link to="/accounts">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('accounts.backToAccounts')}
          </Link>
        </Button>
      </div>
    )
  }

  // Calcular balance total en todas las cadenas
  const totalBalance = balances.reduce((sum, balance) => sum + balance.total, BigInt(0))
  const primaryChain = balances.length > 0 ? balances[0].chainName : 'Polkadot'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button asChild variant="ghost" size="sm" className="flex-shrink-0">
            <Link to="/accounts">
              <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t('common.back')}</span>
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Detalles de la Cuenta</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Información completa y balances multi-cadena
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to={`/send?from=${address}`}>
              <Send className="mr-2 h-4 w-4" />
              {t('accounts.send')}
            </Link>
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteAccount} className="w-full sm:w-auto">
            <Trash2 className="mr-2 h-4 w-4" />
            {t('accounts.delete')}
          </Button>
        </div>
      </div>

      {/* Información de la Cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Información de la Cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar y Dirección */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <Avatar className="h-16 w-16">
              <Identicon
                value={account.address}
                size={64}
                theme="polkadot"
              />
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">
                  {account.meta.name || t('accounts.noName')}
                </h2>
                {accountDetails && (
                  <Badge variant="outline">
                    {accountDetails.type || 'sr25519'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs sm:text-sm font-mono text-muted-foreground break-all">
                  {account.address}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCopyAddress}
                  title={t('accounts.copyAddress')}
                >
                  {copiedAddress ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Detalles Adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountDetails && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Key className="h-4 w-4" />
                    <span>{t('accounts.cryptoType')}</span>
                  </div>
                  <p className="font-medium">{accountDetails.type || 'sr25519'}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{t('accounts.creationDate')}</span>
                  </div>
                  <p className="font-medium">
                    {accountDetails.createdAt 
                      ? new Date(accountDetails.createdAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')
                      : 'N/A'}
                  </p>
                </div>

                {accountDetails.updatedAt && accountDetails.updatedAt !== accountDetails.createdAt && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{t('accounts.lastUpdate')}</span>
                    </div>
                    <p className="font-medium">
                      {new Date(accountDetails.updatedAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                    </p>
                  </div>
                )}

                {accountDetails.meta?.tags && accountDetails.meta.tags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('accounts.tags')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {accountDetails.meta.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {account.meta.notes && (
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{t('accounts.notes')}</span>
                </div>
                <p className="text-sm">{account.meta.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Balances Multi-Cadena */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Balances Multi-Cadena
              </CardTitle>
              <CardDescription>
                {lastUpdate && `Última actualización: ${new Date(lastUpdate).toLocaleTimeString('es-ES')}`}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={isLoadingBalances}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingBalances ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {balanceError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{balanceError}</AlertDescription>
            </Alert>
          )}

          {isLoadingBalances ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
              <p>{t('accounts.loadingBalances')}</p>
            </div>
          ) : balances.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t('accounts.noBalances')}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {/* Balance Total */}
              <div className="p-3 sm:p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">{t('accounts.totalBalance')}</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold mt-1 break-words">
                      {formatBalanceForDisplay(totalBalance, primaryChain)}
                    </p>
                  </div>
                  <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0 ml-2" />
                </div>
              </div>

              {/* Balances por Cadena */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {balances.map((balance) => (
                  <Card key={balance.chain} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{balance.chainName}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {getChainSymbol(balance.chainName)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('accounts.free')}:</span>
                          <span className="font-medium">
                            {formatBalanceForDisplay(balance.free, balance.chainName)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{t('accounts.reserved')}:</span>
                          <span>
                            {formatBalanceForDisplay(balance.reserved, balance.chainName)}
                          </span>
                        </div>
                        {balance.frozen > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('accounts.frozen')}:</span>
                            <span>
                              {formatBalanceForDisplay(balance.frozen, balance.chainName)}
                            </span>
                          </div>
                        )}
                        <Separator className="my-2" />
                        <div className="flex justify-between">
                          <span className="font-medium">{t('accounts.total')}:</span>
                          <span className="font-bold">
                            {formatBalanceForDisplay(balance.total, balance.chainName)}
                          </span>
                        </div>
                        {balance.nonce !== undefined && (
                          <div className="flex justify-between text-xs text-muted-foreground pt-1">
                            <span>{t('accounts.nonce')}:</span>
                            <span>{balance.nonce}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounts.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={`/send?from=${address}`}>
                <Send className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{t('accounts.send')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={`/receive?address=${address}`}>
                <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{t('accounts.receive')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={`/identity?address=${address}`}>
                <Shield className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{t('accounts.identity')}</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={`/transactions?account=${address}`}>
                <ExternalLink className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{t('nav.transactions')}</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
