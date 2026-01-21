/**
 * Página: Crear Emergencia
 * Formulario para crear una nueva emergencia
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useEmergency } from '@/hooks/useEmergency'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import type { EmergencyType, EmergencySeverity, GPSPoint } from '@/types/emergencies'
import { AlertTriangle, MapPin, Loader2 } from 'lucide-react'

export default function CreateEmergency() {
  const navigate = useNavigate()
  const [type, setType] = useState<EmergencyType>('medical')
  const [severity, setSeverity] = useState<EmergencySeverity>('high')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { createAndSubmitEmergency } = useEmergency()

  // GPS tracking para obtener ubicación actual
  const {
    currentLocation: gpsLocation,
    hasPermission,
    addManualPoint,
  } = useGPSTracking({
    enabled: false, // No tracking continuo, solo una lectura
    highAccuracy: true,
  })

  const handleCreateEmergency = async () => {
    if (!description.trim() && severity !== 'critical') {
      toast.error('Por favor, proporciona una descripción de la emergencia')
      return
    }

    // Obtener ubicación
    let location: GPSPoint | null = gpsLocation

    // Si no hay ubicación, intentar obtenerla
    if (!location) {
      try {
        if (hasPermission) {
          try {
            await addManualPoint()
            await new Promise((resolve) => setTimeout(resolve, 500))
            location = gpsLocation
          } catch (error) {
            console.warn('[CreateEmergency] Error al obtener ubicación:', error)
          }
        }

        // Si aún no hay ubicación, intentar directamente con geolocation
        if (!location) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 10000)
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeout)
                resolve(pos)
              },
              reject,
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          })

          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? undefined,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          }
        }
      } catch (error) {
        console.error('[CreateEmergency] Error al obtener ubicación:', error)
        toast.error('No se pudo obtener la ubicación GPS', {
          description: 'Por favor, asegúrate de que el GPS esté activado',
        })
        return
      }
    }

    if (!location) {
      toast.error('No se pudo obtener la ubicación GPS')
      return
    }

    try {
      setSubmitting(true)
      toast.info('Creando emergencia...')

      const emergency = await createAndSubmitEmergency({
        type,
        severity,
        description,
        location,
      })

      if (emergency) {
        toast.success('Emergencia creada exitosamente')
        navigate(`/emergencies/${emergency.emergencyId}`)
      }
    } catch (error) {
      console.error('[CreateEmergency] Error:', error)
      toast.error('Error al crear emergencia', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear Emergencia</CardTitle>
          <CardDescription>
            Reporta una emergencia que será registrada en blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de emergencia */}
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Emergencia</Label>
            <Select value={type} onValueChange={(v) => setType(v as EmergencyType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">Médica</SelectItem>
                <SelectItem value="rescue">Rescate</SelectItem>
                <SelectItem value="weather">Clima</SelectItem>
                <SelectItem value="equipment">Equipo</SelectItem>
                <SelectItem value="lost">Extraviado</SelectItem>
                <SelectItem value="injury">Lesión</SelectItem>
                <SelectItem value="illness">Enfermedad</SelectItem>
                <SelectItem value="avalanche">Avalancha</SelectItem>
                <SelectItem value="rockfall">Caída de rocas</SelectItem>
                <SelectItem value="other">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severidad */}
          <div className="space-y-2">
            <Label htmlFor="severity">Severidad</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as EmergencySeverity)}
            >
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Describe la emergencia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Ubicación GPS */}
          <div className="space-y-2">
            <Label>Ubicación GPS</Label>
            {gpsLocation ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Se obtendrá automáticamente al crear la emergencia
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleCreateEmergency}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Crear Emergencia
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate(-1)} 
              disabled={submitting}
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
