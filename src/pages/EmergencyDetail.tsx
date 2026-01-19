/**
 * Página: Detalle de Emergencia
 * Muestra información completa de una emergencia
 */

import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, MapPin, Clock, ArrowLeft, ExternalLink } from 'lucide-react'
import { useEmergency } from '@/hooks/useEmergency'
import { getAllEmergencies } from '@/utils/emergencyStorage'
import type { Emergency } from '@/types/emergencies'
import { formatDistanceToNow, format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { EmergencyMap } from '@/components/emergencies/EmergencyMap'

export default function EmergencyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { emergencies } = useEmergency()
  const [emergency, setEmergency] = useState<Emergency | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEmergency = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      try {
        // Buscar en el estado local primero
        const localEmergency = emergencies.find((e) => e.emergencyId === id)
        if (localEmergency) {
          setEmergency(localEmergency)
          setLoading(false)
          return
        }

        // Si no está en el estado, buscar en IndexedDB
        const allEmergencies = await getAllEmergencies()
        const found = allEmergencies.find((e) => e.emergencyId === id)
        setEmergency(found || null)
      } catch (error) {
        console.error('[EmergencyDetail] Error al cargar emergencia:', error)
      } finally {
        setLoading(false)
      }
    }

    loadEmergency()
  }, [id, emergencies])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Cargando emergencia...</p>
      </div>
    )
  }

  if (!emergency) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Emergencia no encontrada
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Botón volver */}
      <Button variant="outline" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver
      </Button>

      {/* Información principal */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Emergencia
              </CardTitle>
              <CardDescription>ID: {emergency.emergencyId}</CardDescription>
            </div>
            <div className="flex flex-col gap-2">
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Descripción */}
          <div>
            <h3 className="font-semibold mb-2">Descripción</h3>
            <p className="text-sm">{emergency.description}</p>
          </div>

          {/* Mapa de Emergencia */}
          <EmergencyMap emergency={emergency} />

          {/* Identidad del Reporter */}
          {emergency.metadata?.reporterIdentity && (
            <div>
              <h3 className="font-semibold mb-2">Identidad del Reporter</h3>
              <div className="bg-muted p-3 rounded space-y-2">
                {emergency.metadata.reporterIdentity.display && (
                  <div>
                    <span className="text-sm text-muted-foreground">Nombre:</span>
                    <p className="font-medium">{emergency.metadata.reporterIdentity.display}</p>
                  </div>
                )}
                {emergency.metadata.reporterIdentity.legal && (
                  <div>
                    <span className="text-sm text-muted-foreground">Legal:</span>
                    <p className="text-sm">{emergency.metadata.reporterIdentity.legal}</p>
                  </div>
                )}
                {emergency.metadata.reporterIdentity.email && (
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="text-sm">{emergency.metadata.reporterIdentity.email}</p>
                  </div>
                )}
                {emergency.metadata.reporterIdentity.web && (
                  <div>
                    <span className="text-sm text-muted-foreground">Web:</span>
                    <a
                      href={emergency.metadata.reporterIdentity.web}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {emergency.metadata.reporterIdentity.web}
                    </a>
                  </div>
                )}
                {emergency.metadata.reporterIdentityChain && (
                  <div>
                    <span className="text-sm text-muted-foreground">Cadena:</span>
                    <p className="text-sm capitalize">{emergency.metadata.reporterIdentityChain}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cuenta Reportera */}
          <div>
            <h3 className="font-semibold mb-2">Cuenta Reportera</h3>
            <p className="font-mono text-xs break-all">{emergency.reporterAccount}</p>
            {!emergency.metadata?.reporterIdentity && (
              <p className="text-xs text-muted-foreground mt-1">
                ⚠️ No se encontró identidad registrada en PeopleChain
              </p>
            )}
          </div>

          {/* Ubicación (información adicional) */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Coordenadas
            </h3>
            <div className="text-sm space-y-1">
              <p>
                Lat: {emergency.location.latitude.toFixed(6)}, Lon:{' '}
                {emergency.location.longitude.toFixed(6)}
              </p>
              {emergency.location.altitude && (
                <p>Altitud: {emergency.location.altitude.toFixed(0)} m</p>
              )}
              {emergency.location.accuracy && (
                <p>Precisión: {emergency.location.accuracy.toFixed(0)} m</p>
              )}
              <a
                href={`https://www.google.com/maps?q=${emergency.location.latitude},${emergency.location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Ver en Google Maps
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Fechas */}
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Fechas
            </h3>
            <div className="text-sm space-y-1">
              <p>
                Creada:{' '}
                {format(emergency.createdAt, "PPpp", { locale: es })} (
                {formatDistanceToNow(emergency.createdAt, {
                  addSuffix: true,
                  locale: es,
                })}
                )
              </p>
              {emergency.submittedAt && (
                <p>
                  Enviada:{' '}
                  {format(emergency.submittedAt, "PPpp", { locale: es })} (
                  {formatDistanceToNow(emergency.submittedAt, {
                    addSuffix: true,
                    locale: es,
                  })}
                  )
                </p>
              )}
              {emergency.resolvedAt && (
                <p>
                  Resuelta:{' '}
                  {format(emergency.resolvedAt, "PPpp", { locale: es })} (
                  {formatDistanceToNow(emergency.resolvedAt, {
                    addSuffix: true,
                    locale: es,
                  })}
                  )
                </p>
              )}
            </div>
          </div>

          {/* Blockchain info */}
          {emergency.blockchainTxHash && (
            <div>
              <h3 className="font-semibold mb-2">Blockchain</h3>
              <div className="text-sm space-y-1">
                <p>TX Hash: {emergency.blockchainTxHash}</p>
                {emergency.blockchainBlockNumber && (
                  <p>Bloque: {emergency.blockchainBlockNumber}</p>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {emergency.metadata && Object.keys(emergency.metadata).length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Información Adicional</h3>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                {JSON.stringify(emergency.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
