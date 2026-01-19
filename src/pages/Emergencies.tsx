/**
 * Página: Lista Completa de Emergencias
 * Muestra todas las emergencias con filtros
 */

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useEmergency } from '@/hooks/useEmergency'
import { Link } from 'react-router-dom'
import type { Emergency } from '@/types/emergencies'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { AlertTriangle, MapPin, Clock } from 'lucide-react'

export default function Emergencies() {
  const { emergencies } = useEmergency()
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  const filtered = useMemo(() => {
    if (filter === 'active') {
      return emergencies.filter(
        (e) =>
          e.status === 'pending' ||
          e.status === 'submitted' ||
          e.status === 'acknowledged' ||
          e.status === 'in_progress'
      )
    }
    if (filter === 'resolved') {
      return emergencies.filter(
        (e) => e.status === 'resolved' || e.status === 'cancelled'
      )
    }
    return emergencies
  }, [emergencies, filter])

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Todas ({emergencies.length})</TabsTrigger>
          <TabsTrigger value="active">
            Activas (
            {
              emergencies.filter(
                (e) =>
                  e.status === 'pending' ||
                  e.status === 'submitted' ||
                  e.status === 'acknowledged' ||
                  e.status === 'in_progress'
              ).length
            }
            )
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resueltas (
            {
              emergencies.filter(
                (e) => e.status === 'resolved' || e.status === 'cancelled'
              ).length
            }
            )
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay emergencias en esta categoría
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((emergency) => (
            <EmergencyCard key={emergency.emergencyId} emergency={emergency} />
          ))
        )}
      </div>
    </div>
  )
}

function EmergencyCard({ emergency }: { emergency: Emergency }) {
  return (
    <Link to={`/emergencies/${emergency.emergencyId}`} className="block">
      <Card className="hover:bg-accent transition-colors">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
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
                <Badge variant="outline">{emergency.status}</Badge>
              </div>
              <p className="text-sm font-medium">{emergency.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {emergency.location.latitude.toFixed(4)},{' '}
                    {emergency.location.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(emergency.createdAt, {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
