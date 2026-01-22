/**
 * Página principal: Dashboard de Emergencias
 * Muestra emergencias activas y estado del sistema de escucha
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Activity } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useEmergency } from '@/hooks/useEmergency'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { FAB } from '@/components/ui/fab'
import { useIsMobile } from '@/hooks/use-mobile'

// Lazy load del monitor para mejorar LCP - es un componente pesado
const BlockchainRadioMonitor = lazy(() => import('@/components/BlockchainRadioMonitor').then(module => ({ default: module.BlockchainRadioMonitor })))

export default function Home() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { emergencies } = useEmergency()

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
      {/* Monitor de Radio de Blockchain - Lazy loaded para mejorar LCP */}
      <Suspense fallback={
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      }>
        <BlockchainRadioMonitor />
      </Suspense>

      {/* Emergencias Activas */}
      <Card className="card-elevated fade-in">
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
                  className="block fade-in"
                >
                  <Card className="emergency-card card-elevated active:scale-[0.98] cursor-pointer min-h-[80px]">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge
                              variant={
                                emergency.severity === 'critical'
                                  ? 'emergency-critical'
                                  : emergency.severity === 'high'
                                    ? 'emergency-high'
                                    : emergency.severity === 'medium'
                                      ? 'emergency-medium'
                                      : 'emergency-low'
                              }
                              className={`text-xs severity-badge ${
                                emergency.severity === 'critical' ? 'severity-critical' :
                                emergency.severity === 'high' ? 'severity-high' : ''
                              }`}
                            >
                              {emergency.severity === 'critical' ? 'CRÍTICA' :
                               emergency.severity === 'high' ? 'ALTA' :
                               emergency.severity === 'medium' ? 'MEDIA' : 'BAJA'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {emergency.type}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-1 line-clamp-2">
                            {emergency.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
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

      {/* Botón de Emergencia - Desktop: Botón completo, Mobile: FAB */}
      {!isMobile ? (
        <Button size="lg" variant="destructive" className="w-full" asChild>
          <Link to="/emergencies/create">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Crear Emergencia
          </Link>
        </Button>
      ) : null}

      {/* FAB para crear emergencia - Solo en móvil, posicionado a la izquierda para usuarios diestros */}
      {isMobile && (
        <FAB
          icon={AlertTriangle}
          label="Crear Emergencia"
          onClick={() => navigate('/emergencies/create')}
          variant="destructive"
          position="left"
          aria-label="Crear nueva emergencia"
        />
      )}
    </div>
  )
}
