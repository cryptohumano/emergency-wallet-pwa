import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  getAllTransactions, 
  getTransactionsByAccount, 
  getTransactionsByChain,
  getTransactionsByStatus,
  type StoredTransaction 
} from '@/utils/transactionStorage'
import { formatBalanceForDisplay } from '@/utils/balance'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { useActiveAccount } from '@/contexts/ActiveAccountContext'
import { useI18n } from '@/contexts/I18nContext'
import { 
  Send, 
  ArrowRight,
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  ExternalLink,
  Copy,
  Check,
  Filter,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import Identicon from '@polkadot/react-identicon'
import { Avatar } from '@/components/ui/avatar'

type FilterType = 'all' | 'account' | 'chain' | 'status'
type StatusFilter = 'all' | StoredTransaction['status']

export default function Transactions() {
  const [searchParams] = useSearchParams()
  const { accounts } = useKeyringContext()
  const { t, language } = useI18n()
  const [transactions, setTransactions] = useState<StoredTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [selectedChain, setSelectedChain] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  // Obtener filtros de URL
  const accountFromUrl = searchParams.get('account')
  const chainFromUrl = searchParams.get('chain')

  useEffect(() => {
    if (accountFromUrl) {
      setFilterType('account')
      setSelectedAccount(accountFromUrl)
    } else if (chainFromUrl) {
      setFilterType('chain')
      setSelectedChain(chainFromUrl)
    }
  }, [accountFromUrl, chainFromUrl])

  const loadTransactions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      let loaded: StoredTransaction[] = []

      if (filterType === 'account' && selectedAccount) {
        loaded = await getTransactionsByAccount(selectedAccount)
      } else if (filterType === 'chain' && selectedChain) {
        loaded = await getTransactionsByChain(selectedChain)
      } else if (filterType === 'status' && statusFilter !== 'all') {
        loaded = await getTransactionsByStatus(statusFilter)
      } else {
        loaded = await getAllTransactions()
      }

      // Aplicar filtro de estado adicional si está seleccionado
      if (statusFilter !== 'all' && filterType !== 'status') {
        loaded = loaded.filter(tx => tx.status === statusFilter)
      }

      // Log para debugging: verificar si hay transacciones de emergencia
      const emergencyTxs = loaded.filter(tx => tx.metadata && tx.metadata.emergencyId)
      console.log('[Transactions] Transacciones cargadas:', {
        total: loaded.length,
        emergencias: emergencyTxs.length,
        emergenciasIds: emergencyTxs.map(tx => ({ id: tx.id, txHash: tx.txHash, metadata: tx.metadata })),
      })

      setTransactions(loaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar transacciones')
      console.error('Error al cargar transacciones:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [filterType, selectedAccount, selectedChain, statusFilter])

  const handleCopyHash = async (hash: string) => {
    await navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  const getStatusBadge = (status: StoredTransaction['status']) => {
    switch (status) {
      case 'finalized':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('transactions.finalized')}
          </Badge>
        )
      case 'inBlock':
        return (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            {t('transactions.inBlock')}
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {t('transactions.pending')}
          </Badge>
        )
      case 'invalid':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('transactions.invalid')}
          </Badge>
        )
      case 'dropped':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('transactions.dropped')}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Verificar si una transacción es una emergencia
  const isEmergency = (tx: StoredTransaction): boolean => {
    return !!(tx.metadata && tx.metadata.emergencyId)
  }

  // Obtener información de emergencia
  const getEmergencyInfo = (tx: StoredTransaction) => {
    if (!isEmergency(tx)) return null
    return {
      emergencyId: tx.metadata?.emergencyId as string,
      type: tx.metadata?.emergencyType as string,
      severity: tx.metadata?.emergencySeverity as string,
      relatedLogId: tx.metadata?.relatedLogId as string | undefined,
    }
  }

  // Obtener cadenas únicas de las transacciones
  const uniqueChains = Array.from(new Set(transactions.map(tx => tx.chain)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('transactions.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('transactions.description')}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadTransactions}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('transactions.refresh')}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('transactions.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('transactions.filterType')}</Label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('transactions.all')}</SelectItem>
                  <SelectItem value="account">{t('transactions.byAccount')}</SelectItem>
                  <SelectItem value="chain">{t('transactions.byChain')}</SelectItem>
                  <SelectItem value="status">{t('transactions.byStatus')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === 'account' && (
              <div className="space-y-2">
                <Label>{t('accounts.title')}</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transactions.selectAccount')} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.address} value={account.address}>
                        {account.meta.name || t('accounts.noName')} - {formatAddress(account.address)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === 'chain' && (
              <div className="space-y-2">
                <Label>{t('transactions.chain')}</Label>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('transactions.selectChain')} />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueChains.map((chain) => (
                      <SelectItem key={chain} value={chain}>
                        {chain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {filterType === 'status' && (
              <div className="space-y-2">
                <Label>{t('transactions.status')}</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('transactions.allStatus')}</SelectItem>
                    <SelectItem value="pending">{t('transactions.pending')}</SelectItem>
                    <SelectItem value="inBlock">{t('transactions.inBlock')}</SelectItem>
                    <SelectItem value="finalized">{t('transactions.finalized')}</SelectItem>
                    <SelectItem value="invalid">{t('transactions.invalid')}</SelectItem>
                    <SelectItem value="dropped">{t('transactions.dropped')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro de estado adicional (siempre visible) */}
            {filterType !== 'status' && (
              <div className="space-y-2">
                <Label>{t('transactions.status')}</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('transactions.allStatus')}</SelectItem>
                    <SelectItem value="pending">{t('transactions.pending')}</SelectItem>
                    <SelectItem value="inBlock">{t('transactions.inBlock')}</SelectItem>
                    <SelectItem value="finalized">{t('transactions.finalized')}</SelectItem>
                    <SelectItem value="invalid">{t('transactions.invalid')}</SelectItem>
                    <SelectItem value="dropped">{t('transactions.dropped')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>{t('transactions.title')}</CardTitle>
          <CardDescription>
            {transactions.length > 0 
              ? `${transactions.length} ${t('transactions.title').toLowerCase()}`
              : t('transactions.noTransactionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('common.loading')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">{t('transactions.noTransactions')}</p>
              <Button asChild>
                <Link to="/send">
                  <Send className="mr-2 h-4 w-4" />
                  {t('accounts.send')}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const fromAccount = accounts.find(acc => acc.address === tx.accountAddress)
                const emergencyInfo = getEmergencyInfo(tx)
                const isEmergencyTx = isEmergency(tx)
                
                // Debug log para verificar detección de emergencias
                if (isEmergencyTx) {
                  console.log('[Transactions] Transacción de emergencia detectada:', {
                    id: tx.id,
                    txHash: tx.txHash,
                    metadata: tx.metadata,
                    emergencyInfo,
                  })
                }
                
                return (
                  <div
                    key={tx.id}
                    className={`p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                      isEmergencyTx ? 'border-red-300 bg-red-50/30 dark:bg-red-950/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <Identicon
                            value={tx.accountAddress}
                            size={40}
                            theme="polkadot"
                          />
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {isEmergencyTx ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="font-semibold text-red-600">
                                  {t('transactions.emergency')}: {emergencyInfo?.type ? t(`emergencies.types.${emergencyInfo.type}`) : t('common.error')}
                                </span>
                                <Badge variant="destructive" className="gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {emergencyInfo?.severity ? t(`emergencies.severityLabels.${emergencyInfo.severity}`) : ''}
                                </Badge>
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold">
                                  {fromAccount?.meta.name || t('transactions.unknownAccount')}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {formatAddress(tx.toAddress)}
                                </span>
                              </>
                            )}
                          </div>
                          {isEmergencyTx && emergencyInfo && (
                            <div className="mb-2 text-sm text-muted-foreground">
                              ID: {emergencyInfo.emergencyId.substring(0, 8)}...
                              {emergencyInfo.relatedLogId && ` • ${t('transactions.relatedLog')}: ${emergencyInfo.relatedLogId.substring(0, 8)}...`}
                            </div>
                          )}
                          <div className="flex items-center gap-3 flex-wrap">
                            {!isEmergencyTx && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">{t('transactions.amount')}:</span>
                                <span className="font-medium">
                                  {formatBalanceForDisplay(BigInt(tx.amount), tx.chain)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">{t('transactions.chain')}:</span>
                              <Badge variant="outline">{tx.chain}</Badge>
                            </div>
                            {tx.fee && !isEmergencyTx && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-muted-foreground">Fee:</span>
                                <span className="text-sm">
                                  {formatBalanceForDisplay(BigInt(tx.fee), tx.chain)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-xs font-mono text-muted-foreground break-all">
                              {tx.txHash}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleCopyHash(tx.txHash)}
                              title={t('transactions.copyHash')}
                            >
                              {copiedHash === tx.txHash ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          {tx.blockNumber && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {t('emergencies.detail.block')} #{tx.blockNumber} - {new Date(tx.createdAt).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        {isEmergencyTx && (
                          <Badge variant="destructive" className="gap-1 mb-1">
                            <AlertTriangle className="h-3 w-3" />
                            {t('transactions.emergency')}
                          </Badge>
                        )}
                        {getStatusBadge(tx.status)}
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/transactions/${tx.txHash}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
