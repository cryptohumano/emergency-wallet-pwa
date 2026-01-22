/**
 * Monitor de eventos de blockchain tipo "Radio"
 * Muestra todos los eventos en tiempo real como una radio de blockchain
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Radio, Activity, AlertTriangle, X, Power, PowerOff, MapPin, Clock, ExternalLink, Bell, BellOff } from 'lucide-react'
import { useRemarkListenerContext } from '@/contexts/RemarkListenerContext'
import { useActiveAccount } from '@/contexts/ActiveAccountContext'
import { useRadioMonitor } from '@/contexts/RadioMonitorContext'
import { formatDistanceToNow, format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useState, useMemo, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BlockchainEvent } from '@/services/blockchain/RemarkListener'
import { getAllEmergencies } from '@/utils/emergencyStorage'
import type { Emergency } from '@/types/emergencies'
import { EmergencyMap } from '@/components/emergencies/EmergencyMap'
import { toast } from 'sonner'
import Identicon from '@polkadot/react-identicon'
import { useI18n } from '@/contexts/I18nContext'

export function BlockchainRadioMonitor() {
  const { t, language } = useI18n()
  const { 
    isListening, 
    events, 
    receivedCount, 
    currentBlockNumber,
    lastProcessedBlock,
    blocksProcessedCount,
    isManuallyEnabled,
    startListener,
    stopListener
  } = useRemarkListenerContext()
  const { activeAccount, activeAccountData } = useActiveAccount()
  const { isExpanded, setIsExpanded } = useRadioMonitor()
  const [filter, setFilter] = useState<'all' | 'System.Remarked' | 'emergencies'>('all')
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<BlockchainEvent | null>(null) // Evento seleccionado para mostrar data
  const [showEmergencyDetails, setShowEmergencyDetails] = useState(false)
  const [loadingEmergency, setLoadingEmergency] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'default'
  )

  // Verificar permisos de notificación
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      
      // Escuchar cambios en los permisos
      const checkPermission = () => {
        setNotificationPermission(Notification.permission)
      }
      
      // Verificar cuando el componente se monta y cuando hay cambios de visibilidad
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          checkPermission()
        }
      }
      
      document.addEventListener('visibilitychange', handleVisibilityChange)
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // Solicitar permisos de notificación
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(t('radioMonitor.notificationsNotSupported'))
      return
    }

    if (Notification.permission === 'granted') {
      toast.info(t('radioMonitor.notificationsAlreadyGranted'))
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        toast.success(t('radioMonitor.notificationsGranted'), {
          description: t('radioMonitor.notificationsGrantedDesc'),
        })
      } else if (permission === 'denied') {
        toast.error(t('radioMonitor.notificationsDenied'), {
          description: t('radioMonitor.notificationsDeniedDesc'),
        })
      }
    } catch (error) {
      console.error('[BlockchainRadioMonitor] Error al solicitar permisos:', error)
      toast.error(t('radioMonitor.requestPermissionError'))
    }
  }

  // Filtrar eventos según el filtro
  const filteredEvents = useMemo(() => {
    let filtered = events
    
    if (filter === 'System.Remarked') {
      filtered = events.filter((e) => e.type === 'System.Remarked')
    } else if (filter === 'emergencies') {
      // Filtrar solo System.Remarked que tienen contenido EMERGENCY:
      filtered = events.filter((e) => 
        e.type === 'System.Remarked' && 
        e.data?.remarkContent?.startsWith('EMERGENCY:')
      )
    }
    // filter === 'all' no filtra nada
    
    return filtered
  }, [events, filter])

  // Obtener color según el tipo de evento
  const getEventColor = (type: BlockchainEvent['type']) => {
    switch (type) {
      case 'System.Remarked':
        return 'bg-red-500/20 text-red-600 border-red-500/50'
      case 'System.ExtrinsicSuccess':
        return 'bg-green-500/20 text-green-600 border-green-500/50'
      case 'System.ExtrinsicFailed':
        return 'bg-orange-500/20 text-orange-600 border-orange-500/50'
      case 'Balances.Transfer':
        return 'bg-blue-500/20 text-blue-600 border-blue-500/50'
      default:
        return 'bg-gray-500/20 text-gray-600 border-gray-500/50'
    }
  }

  // Obtener icono según el tipo de evento
  const getEventIcon = (type: BlockchainEvent['type']) => {
    switch (type) {
      case 'System.Remarked':
        return <AlertTriangle className="h-4 w-4" />
      case 'System.ExtrinsicSuccess':
        return <Activity className="h-4 w-4" />
      case 'System.ExtrinsicFailed':
        return <X className="h-4 w-4" />
      default:
        return <Radio className="h-4 w-4" />
    }
  }

  // Manejar clic en evento para buscar emergencia
  const handleEventClick = async (event: BlockchainEvent) => {
    if (event.type !== 'System.Remarked') {
      return
    }

    setSelectedEvent(event) // Guardar el evento para mostrar su data
    setLoadingEmergency(true)
    setShowEmergencyDetails(true)

    try {
      console.log('[BlockchainRadioMonitor] 🔍 Buscando emergencia para evento:', {
        blockHash: event.blockHash,
        blockNumber: event.blockNumber,
        accountId: event.accountId,
        data: event.data,
      })

      // Buscar emergencia por blockHash o blockNumber
      const allEmergencies = await getAllEmergencies()
      console.log('[BlockchainRadioMonitor] 📦 Total emergencias en IndexedDB:', allEmergencies.length)
      
      // Log de todas las emergencias para debug
      if (allEmergencies.length > 0) {
        console.log('[BlockchainRadioMonitor] 📋 Emergencias en DB:', allEmergencies.map(e => ({
          id: e.emergencyId,
          blockHash: e.blockchainTxHash?.substring(0, 20),
          blockNumber: e.blockchainBlockNumber,
          account: e.reporterAccount?.substring(0, 12),
        })))
      }

      // Buscar por blockHash primero (más preciso)
      let emergency = event.blockHash
        ? allEmergencies.find((e) => {
            const match = e.blockchainTxHash === event.blockHash
            if (match) {
              console.log('[BlockchainRadioMonitor] ✅ Encontrada por blockHash:', e.emergencyId)
            }
            return match
          })
        : null

      // Si no se encuentra por blockHash, buscar por blockNumber
      if (!emergency && event.blockNumber) {
        console.log('[BlockchainRadioMonitor] 🔍 Buscando por blockNumber:', event.blockNumber)
        emergency = allEmergencies.find((e) => {
          const match = e.blockchainBlockNumber === event.blockNumber
          if (match) {
            console.log('[BlockchainRadioMonitor] ✅ Encontrada por blockNumber:', e.emergencyId)
          }
          return match
        })
      }

      // Si aún no se encuentra, buscar por accountId y timestamp cercano
      if (!emergency && event.accountId && event.timestamp) {
        console.log('[BlockchainRadioMonitor] 🔍 Buscando por accountId y timestamp')
        const timeWindow = 300000 // 5 minutos (más amplio)
        emergency = allEmergencies.find((e) => {
          const accountMatch = e.reporterAccount === event.accountId
          const timeMatch = Math.abs((e.submittedAt || e.createdAt) - event.timestamp) < timeWindow
          const match = accountMatch && timeMatch
          if (match) {
            console.log('[BlockchainRadioMonitor] ✅ Encontrada por accountId+timestamp:', e.emergencyId)
          }
          return match
        })
      }

      if (emergency) {
        console.log('[BlockchainRadioMonitor] ✅ Emergencia encontrada:', emergency.emergencyId)
        setSelectedEmergency(emergency)
      } else {
        console.warn('[BlockchainRadioMonitor] ⚠️ Emergencia no encontrada en IndexedDB')
        // Mostrar información del evento aunque no esté guardada
        setSelectedEmergency(null)
      }
    } catch (error) {
      console.error('[BlockchainRadioMonitor] ❌ Error al buscar emergencia:', error)
      setSelectedEmergency(null)
    } finally {
      setLoadingEmergency(false)
    }
  }

  // Obtener etiqueta de tipo
  const getTypeLabel = (type: Emergency['type']) => {
    return t(`emergencies.types.${type}`) || type
  }
  
  // Obtener etiqueta de severidad
  const getSeverityLabel = (severity: Emergency['severity']) => {
    return t(`emergencies.severityLabels.${severity}`)
  }

  // Obtener color de severidad
  const getSeverityColor = (severity: Emergency['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 font-bold'
      case 'high':
        return 'text-orange-600 font-semibold'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return ''
    }
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 space-y-3">
        {/* Primera fila: Título y botón expandir/colapsar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Radio className="h-5 w-5 text-primary flex-shrink-0" />
            <CardTitle className="text-lg truncate">{t('radioMonitor.title')}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0"
          >
            {isExpanded ? t('radioMonitor.collapse') : t('radioMonitor.expand')}
          </Button>
        </div>

        {/* Segunda fila: Estado y controles - responsive */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Estado, bloque y cuenta activa */}
          <div className="flex items-center gap-2 flex-wrap">
            {isListening ? (
              <Badge variant="default" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="hidden sm:inline">{t('radioMonitor.live')}</span>
                <span className="sm:hidden">{t('radioMonitor.liveShort')}</span>
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="hidden sm:inline">{t('radioMonitor.disconnected')}</span>
                <span className="sm:hidden">{t('radioMonitor.disconnectedShort')}</span>
              </Badge>
            )}
            {currentBlockNumber !== null && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Activity className="h-3 w-3" />
                <span className="hidden sm:inline">{t('radioMonitor.block')} #{currentBlockNumber.toLocaleString()}</span>
                <span className="sm:hidden">#{currentBlockNumber.toLocaleString()}</span>
              </Badge>
            )}
            {/* Cuenta activa integrada */}
            {activeAccount && activeAccountData && (
              <Badge variant="outline" className="gap-1.5 text-xs">
                <Identicon
                  value={activeAccount}
                  size={12}
                  theme="polkadot"
                />
                <span className="hidden sm:inline">
                  {activeAccountData.meta.name || t('radioMonitor.account')}
                </span>
                <span className="sm:hidden">
                  {activeAccount.substring(0, 6)}...
                </span>
              </Badge>
            )}
          </div>

          {/* Botones de control */}
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Botón de notificaciones */}
            {'Notification' in window && (
              <Button
                variant={notificationPermission === 'granted' ? "default" : "outline"}
                size="sm"
                onClick={requestNotificationPermission}
                className="gap-1 flex-shrink-0"
                title={
                  notificationPermission === 'granted'
                    ? t('radioMonitor.notificationsEnabled')
                    : notificationPermission === 'denied'
                    ? t('radioMonitor.notificationsDeniedManual')
                    : t('radioMonitor.requestPermission')
                }
              >
                {notificationPermission === 'granted' ? (
                  <>
                    <Bell className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('radioMonitor.notifications')}</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('radioMonitor.notifications')}</span>
                  </>
                )}
              </Button>
            )}
            
            {/* Botón encender/apagar */}
            <Button
              variant={isManuallyEnabled ? "destructive" : "default"}
              size="sm"
              onClick={() => {
                if (isManuallyEnabled) {
                  stopListener()
                } else {
                  startListener()
                }
              }}
              className="gap-1 flex-shrink-0 flex-1 sm:flex-initial"
            >
              {isManuallyEnabled ? (
                <>
                  <PowerOff className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('radioMonitor.turnOff')}</span>
                  <span className="sm:hidden">{t('radioMonitor.turnOff')}</span>
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('radioMonitor.turnOn')}</span>
                  <span className="sm:hidden">{t('radioMonitor.turnOn')}</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tercera fila: Descripción */}
        <CardDescription className="text-xs sm:text-sm space-y-1">
          {isManuallyEnabled ? (
            <>
              <div className="hidden sm:block">
                {t('radioMonitor.listening')} • {receivedCount} {t('radioMonitor.emergenciesCount')} • {events.length} {t('radioMonitor.eventsCount')}
              </div>
              <div className="sm:hidden">
                {receivedCount} {t('radioMonitor.emergenciesCount')} • {events.length} {t('radioMonitor.eventsCountShort')}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {currentBlockNumber !== null && (
                  <span className="text-muted-foreground">
                    {t('radioMonitor.currentBlock')}: <span className="font-semibold">#{currentBlockNumber.toLocaleString()}</span>
                  </span>
                )}
                {lastProcessedBlock !== null && (
                  <span className="text-muted-foreground">
                    {t('radioMonitor.analyzing')}: <span className="font-semibold">#{lastProcessedBlock.toLocaleString()}</span>
                  </span>
                )}
                {blocksProcessedCount > 0 && (
                  <span className="text-muted-foreground">
                    {t('radioMonitor.processed')}: <span className="font-semibold">{blocksProcessedCount}</span>
                  </span>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground">
              {t('radioMonitor.serviceDisabled')}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {t('radioMonitor.all')} ({events.length})
            </Button>
            <Button
              variant={filter === 'System.Remarked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('System.Remarked')}
            >
              {t('radioMonitor.remarks')} ({events.filter((e) => e.type === 'System.Remarked').length})
            </Button>
            <Button
              variant={filter === 'emergencies' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('emergencies')}
            >
              {t('radioMonitor.emergencies')} ({events.filter((e) => e.type === 'System.Remarked').length})
            </Button>
          </div>

          {/* Lista de eventos */}
          <ScrollArea className="h-[400px] w-full rounded-md border p-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Radio className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('radioMonitor.noEvents')}</p>
                <p className="text-sm">{t('radioMonitor.noEventsDesc')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event, index) => (
                  <div
                    key={`${event.timestamp}-${index}`}
                    className={`p-3 rounded-lg border ${getEventColor(event.type)} transition-all animate-in slide-in-from-right ${
                      event.type === 'System.Remarked' ? 'cursor-pointer hover:opacity-80' : ''
                    }`}
                    onClick={() => event.type === 'System.Remarked' && handleEventClick(event)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <div className="mt-0.5">{getEventIcon(event.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {event.pallet}
                            </Badge>
                            <span className="text-sm font-medium">{event.name}</span>
                            {event.type === 'System.Remarked' && (
                              <Badge variant="destructive" className="text-xs ml-auto">
                                {t('radioMonitor.viewDetails')}
                              </Badge>
                            )}
                          </div>
                          {event.accountId && (
                            <p className="text-xs text-muted-foreground mb-1">
                              {t('radioMonitor.account')}: {event.accountId.substring(0, 12)}...
                            </p>
                          )}
                          {event.blockNumber && (
                            <p className="text-xs text-muted-foreground">
                              {t('radioMonitor.block')} #{event.blockNumber} • {formatDistanceToNow(event.timestamp, { addSuffix: true, locale: language === 'es' ? es : enUS })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Estadísticas */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-xs text-muted-foreground">{t('radioMonitor.totalEvents')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {events.filter((e) => e.type === 'System.Remarked').length}
              </p>
              <p className="text-xs text-muted-foreground">System.Remarked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{receivedCount}</p>
              <p className="text-xs text-muted-foreground">{t('radioMonitor.emergencies')}</p>
            </div>
          </div>
        </CardContent>
      )}

      {/* Diálogo de detalles de emergencia */}
      <Dialog open={showEmergencyDetails} onOpenChange={setShowEmergencyDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('radioMonitor.emergencyDetails')}
            </DialogTitle>
            <DialogDescription>
              {t('radioMonitor.emergencyDetailsDesc')}
            </DialogDescription>
          </DialogHeader>

          {loadingEmergency ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('radioMonitor.loadingDetails')}</p>
            </div>
          ) : selectedEmergency ? (
            <div className="space-y-4">
              {/* Información principal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">{t('radioMonitor.type')}</span>
                  <p className="font-medium">{getTypeLabel(selectedEmergency.type)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('radioMonitor.severity')}</span>
                  <p className={`font-medium ${getSeverityColor(selectedEmergency.severity)}`}>
                    {getSeverityLabel(selectedEmergency.severity)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('radioMonitor.status')}</span>
                  <p className="font-medium">{selectedEmergency.status}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t('radioMonitor.id')}</span>
                  <p className="font-mono text-xs">{selectedEmergency.emergencyId}</p>
                </div>
              </div>

              {/* Descripción */}
              {selectedEmergency.description && (
                <div>
                  <h3 className="font-semibold mb-2">{t('radioMonitor.description')}</h3>
                  <p className="text-sm">{selectedEmergency.description}</p>
                </div>
              )}

              {/* Mapa de Emergencia */}
              <EmergencyMap emergency={selectedEmergency} />

              {/* Identidad del Reporter */}
              {selectedEmergency.metadata?.reporterIdentity && (
                <div>
                  <h3 className="font-semibold mb-2">{t('radioMonitor.reporterIdentity')}</h3>
                  <div className="bg-muted p-3 rounded space-y-2">
                    {selectedEmergency.metadata.reporterIdentity.display && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('radioMonitor.name')}:</span>
                        <p className="font-medium">{selectedEmergency.metadata.reporterIdentity.display}</p>
                      </div>
                    )}
                    {selectedEmergency.metadata.reporterIdentity.legal && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('radioMonitor.legal')}:</span>
                        <p className="text-sm">{selectedEmergency.metadata.reporterIdentity.legal}</p>
                      </div>
                    )}
                    {selectedEmergency.metadata.reporterIdentity.email && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('radioMonitor.email')}:</span>
                        <p className="text-sm">{selectedEmergency.metadata.reporterIdentity.email}</p>
                      </div>
                    )}
                    {selectedEmergency.metadata.reporterIdentity.web && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('radioMonitor.web')}:</span>
                        <a
                          href={selectedEmergency.metadata.reporterIdentity.web}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {selectedEmergency.metadata.reporterIdentity.web}
                        </a>
                      </div>
                    )}
                    {selectedEmergency.metadata.reporterIdentityChain && (
                      <div>
                        <span className="text-sm text-muted-foreground">{t('radioMonitor.chain')}:</span>
                        <p className="text-sm capitalize">{selectedEmergency.metadata.reporterIdentityChain}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cuenta Reportera */}
              <div>
                <h3 className="font-semibold mb-2">{t('emergencies.detail.reporterAccount')}</h3>
                <p className="font-mono text-xs break-all">{selectedEmergency.reporterAccount}</p>
                {!selectedEmergency.metadata?.reporterIdentity && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ {t('emergencies.detail.noIdentity')}
                  </p>
                )}
              </div>

              {/* Ubicación (información adicional) */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('radioMonitor.coordinates')}
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    {t('radioMonitor.latitude')}: {selectedEmergency.location.latitude.toFixed(6)}, {t('radioMonitor.longitude')}:{' '}
                    {selectedEmergency.location.longitude.toFixed(6)}
                  </p>
                  {selectedEmergency.location.altitude && (
                    <p>{t('radioMonitor.altitude')}: {selectedEmergency.location.altitude.toFixed(0)} m</p>
                  )}
                  {selectedEmergency.location.accuracy && (
                    <p>{t('radioMonitor.accuracy')}: {selectedEmergency.location.accuracy.toFixed(0)} m</p>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${selectedEmergency.location.latitude},${selectedEmergency.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    {t('radioMonitor.viewOnMap')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Fechas */}
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('radioMonitor.dates')}
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    {t('radioMonitor.created')}:{' '}
                    {format(selectedEmergency.createdAt, "PPpp", { locale: language === 'es' ? es : enUS })} (
                    {formatDistanceToNow(selectedEmergency.createdAt, {
                      addSuffix: true,
                      locale: language === 'es' ? es : enUS,
                    })}
                    )
                  </p>
                  {selectedEmergency.submittedAt && (
                    <p>
                      {t('radioMonitor.submitted')}:{' '}
                      {format(selectedEmergency.submittedAt, "PPpp", { locale: language === 'es' ? es : enUS })} (
                      {formatDistanceToNow(selectedEmergency.submittedAt, {
                        addSuffix: true,
                        locale: language === 'es' ? es : enUS,
                      })}
                      )
                    </p>
                  )}
                </div>
              </div>

              {/* Blockchain info */}
              {selectedEmergency.blockchainTxHash && (
                <div>
                  <h3 className="font-semibold mb-2">{t('radioMonitor.blockchain')}</h3>
                  <div className="text-sm space-y-1">
                    <p className="font-mono text-xs break-all">
                      {t('radioMonitor.txHash')}: {selectedEmergency.blockchainTxHash}
                    </p>
                    {selectedEmergency.blockchainBlockNumber && (
                      <p>{t('radioMonitor.block')}: #{selectedEmergency.blockchainBlockNumber.toLocaleString()}</p>
                    )}
                    {selectedEmergency.blockchainExtrinsicIndex !== undefined && (
                      <p>Extrinsic Index: {selectedEmergency.blockchainExtrinsicIndex}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Remark Data (datos decodificados del remark) */}
              {selectedEmergency.remarkData && (
                <div>
                  <h3 className="font-semibold mb-2">{t('radioMonitor.remarkContent')}</h3>
                  <div className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedEmergency.remarkData, (key, value) => {
                        if (typeof value === 'bigint') {
                          return value.toString() + 'n'
                        }
                        return value
                      }, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedEmergency.metadata && Object.keys(selectedEmergency.metadata).length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">{t('emergencies.detail.additionalInfo')}</h3>
                  <div className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedEmergency.metadata, (key, value) => {
                        if (typeof value === 'bigint') {
                          return value.toString() + 'n'
                        }
                        return value
                      }, 2)}
                    </pre>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4 border-b">
                <p className="text-muted-foreground font-medium">
                  {t('emergencies.detail.notFound')}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('emergencies.detail.loading')}
                </p>
              </div>

              {/* Mostrar información del evento aunque no esté guardada */}
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold mb-2">{t('radioMonitor.eventData')}</h3>
                  <div className="text-sm space-y-1">
                    {selectedEvent && (
                      <>
                        {selectedEvent.blockNumber && (
                          <p>
                            <span className="text-muted-foreground">{t('radioMonitor.eventBlock')}:</span>{' '}
                            #{selectedEvent.blockNumber.toLocaleString()}
                          </p>
                        )}
                        {selectedEvent.blockHash && (
                          <p>
                            <span className="text-muted-foreground">{t('transactions.hash')}:</span>{' '}
                            <span className="font-mono text-xs break-all">
                              {selectedEvent.blockHash}
                            </span>
                          </p>
                        )}
                        {selectedEvent.accountId && (
                          <p>
                            <span className="text-muted-foreground">{t('radioMonitor.eventAccount')}:</span>{' '}
                            <span className="font-mono text-xs break-all">
                              {selectedEvent.accountId}
                            </span>
                          </p>
                        )}
                        {selectedEvent.timestamp && (
                          <p>
                            <span className="text-muted-foreground">{t('radioMonitor.eventTimestamp')}:</span>{' '}
                            {format(new Date(selectedEvent.timestamp), "PPpp", { locale: language === 'es' ? es : enUS })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Mostrar contenido del remark decodificado */}
                {selectedEvent?.data?.remarkContent ? (
                  <div>
                    <h3 className="font-semibold mb-2">{t('radioMonitor.remarkContent')}</h3>
                    <div className="bg-muted p-3 rounded text-xs overflow-auto max-h-64">
                      <pre className="whitespace-pre-wrap break-words">
                        {selectedEvent.data.remarkContent}
                      </pre>
                    </div>
                    {selectedEvent.data.remarkContent.startsWith('EMERGENCY:') ? (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                        <p className="text-xs text-green-800 dark:text-green-200">
                          ✅ {t('radioMonitor.validEmergencyFormat')}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          💡 {t('radioMonitor.checkConsole')}
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          ⚠️ {t('radioMonitor.noEmergencyPrefix')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ⚠️ <strong>{t('radioMonitor.cannotExtractRemark')}</strong>
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      {t('radioMonitor.noRemarkContent')}
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-300 mt-1 list-disc list-inside">
                      <li>{t('radioMonitor.noRemarkReason1')}</li>
                      <li>{t('radioMonitor.noRemarkReason2')}</li>
                      <li>{t('radioMonitor.noRemarkReason3')}</li>
                    </ul>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                      {t('radioMonitor.checkConsoleDetails')}
                    </p>
                  </div>
                )}

                {/* Mostrar data del evento completa */}
                {selectedEvent?.data && (
                  <div>
                    <h3 className="font-semibold mb-2">{t('radioMonitor.rawData')}</h3>
                    <div className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedEvent.data, (key, value) => {
                          // Manejar BigInt y otros tipos especiales
                          if (typeof value === 'bigint') {
                            return value.toString()
                          }
                          if (value && typeof value === 'object' && value.toHex) {
                            return value.toHex()
                          }
                          if (value && typeof value === 'object' && value.toString && value.toString() !== '[object Object]') {
                            return value.toString()
                          }
                          return value
                        }, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    💡 <strong>{t('common.warning')}:</strong> {t('radioMonitor.emergencyNote')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
