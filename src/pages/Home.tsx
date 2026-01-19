/**
 * Página principal: Dashboard de Emergencias
 * Muestra emergencias activas y estado del sistema de escucha
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveAccount } from '@/contexts/ActiveAccountContext'
import { useEmergency } from '@/hooks/useEmergency'
import { useRemarkListenerContext } from '@/contexts/RemarkListenerContext'
import { useCurrentChainBalance } from '@/hooks/useMultiChainBalances'
import { useNetwork } from '@/contexts/NetworkContext'
import { formatBalanceForDisplay, getChainSymbol } from '@/utils/balance'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { BlockchainRadioMonitor } from '@/components/BlockchainRadioMonitor'

export default function Home() {
  const { activeAccount } = useActiveAccount()
  const { emergencies } = useEmergency()
  const { isListening } = useRemarkListenerContext()
  const { selectedChain } = useNetwork()
  const { balance } = useCurrentChainBalance(activeAccount)

  // Obtener emergencias activas
  const getActiveEmergencies = () => {
    return emergencies.filter(
      (e) =>
        e.status === 'pending' ||
        e.status === 'submitted' ||
        e.status === 'acknowledged' ||
        e.status === 'in_progress'
    )
  }

  const activeEmergencies = getActiveEmergencies()

  return (
    <div className="space-y-6">
      {/* Monitor de Radio de Blockchain */}
      <BlockchainRadioMonitor />

      {/* Estado de escucha */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Sistema</CardTitle>
          <CardDescription>Estado de conexión y escucha de emergencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {isListening ? (
              <>
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm">Escuchando emergencias...</span>
              </>
            ) : (
              <>
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="text-sm">No conectado</span>
              </>
            )}
          </div>
          {activeAccount && (
            <div className="mt-4 text-sm text-muted-foreground">
              Cuenta activa: {activeAccount.substring(0, 8)}...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance de cuenta activa */}
      {activeAccount && selectedChain && (
        <Card>
          <CardHeader>
            <CardTitle>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {balance ? (
                formatBalanceForDisplay(balance.total, selectedChain.name)
              ) : (
                <span className="text-muted-foreground">Cargando...</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergencias Activas */}
      <Card>
        <CardHeader>
          <CardTitle>Emergencias Activas</CardTitle>
          <CardDescription>
            {activeEmergencies.length} emergencia(s) activa(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeEmergencies.length === 0 ? (
            <p className="text-muted-foreground">No hay emergencias activas</p>
          ) : (
            <div className="space-y-2">
              {activeEmergencies.slice(0, 5).map((emergency) => (
                <Link
                  key={emergency.emergencyId}
                  to={`/emergencies/${emergency.emergencyId}`}
                  className="block"
                >
                  <Card className="hover:bg-accent transition-colors">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={
                                emergency.severity === 'critical'
                                  ? 'destructive'
                                  : emergency.severity === 'high'
                                    ? 'destructive'
                                    : emergency.severity === 'medium'
                                      ? 'default'
                                      : 'secondary'
                              }
                            >
                              {emergency.severity}
                            </Badge>
                            <Badge variant="outline">{emergency.type}</Badge>
                          </div>
                          <p className="text-sm font-medium mt-1">{emergency.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(emergency.createdAt, {
                              addSuffix: true,
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {activeEmergencies.length > 5 && (
                <Link to="/emergencies" className="block">
                  <Button variant="outline" className="w-full">
                    Ver todas las emergencias ({activeEmergencies.length})
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón de Emergencia */}
      <Button size="lg" variant="destructive" className="w-full" asChild>
        <Link to="/emergencies/create">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Crear Emergencia
        </Link>
      </Button>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button variant="outline" asChild>
            <Link to="/emergencies">
              <Activity className="mr-2 h-4 w-4" />
              Ver Todas
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/accounts">Cuentas</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
