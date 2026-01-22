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
import { useI18n } from '@/contexts/I18nContext'

export default function CreateEmergency() {
  const { t } = useI18n()
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
      toast.error(t('emergencies.provideDescription'))
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
        toast.error(t('emergencies.gpsError'), {
          description: t('emergencies.gpsErrorDesc'),
        })
        return
      }
    }

    if (!location) {
      toast.error(t('emergencies.gpsError'))
      return
    }

    try {
      setSubmitting(true)
      toast.info(t('emergencies.creating'))

      const emergency = await createAndSubmitEmergency({
        type,
        severity,
        description,
        location,
      })

      if (emergency) {
        toast.success(t('emergencies.createdSuccess'))
        navigate(`/emergencies/${emergency.emergencyId}`)
      }
    } catch (error) {
      console.error('[CreateEmergency] Error:', error)
      toast.error(t('emergencies.createError'), {
        description: error instanceof Error ? error.message : t('emergencies.unknownError'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('emergencies.createTitle')}</CardTitle>
          <CardDescription>
            {t('emergencies.createDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de emergencia */}
          <div className="space-y-2">
            <Label htmlFor="type">{t('emergencies.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as EmergencyType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">{t('emergencies.types.medical')}</SelectItem>
                <SelectItem value="rescue">{t('emergencies.types.rescue')}</SelectItem>
                <SelectItem value="weather">{t('emergencies.types.weather')}</SelectItem>
                <SelectItem value="equipment">{t('emergencies.types.equipment')}</SelectItem>
                <SelectItem value="lost">{t('emergencies.types.lost')}</SelectItem>
                <SelectItem value="injury">{t('emergencies.types.injury')}</SelectItem>
                <SelectItem value="illness">{t('emergencies.types.illness')}</SelectItem>
                <SelectItem value="avalanche">{t('emergencies.types.avalanche')}</SelectItem>
                <SelectItem value="rockfall">{t('emergencies.types.rockfall')}</SelectItem>
                <SelectItem value="other">{t('emergencies.types.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severidad */}
          <div className="space-y-2">
            <Label htmlFor="severity">{t('emergencies.severity')}</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as EmergencySeverity)}
            >
              <SelectTrigger id="severity">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('emergencies.severityLabels.low')}</SelectItem>
                <SelectItem value="medium">{t('emergencies.severityLabels.medium')}</SelectItem>
                <SelectItem value="high">{t('emergencies.severityLabels.high')}</SelectItem>
                <SelectItem value="critical">{t('emergencies.severityLabels.critical')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('emergencies.description')}</Label>
            <Textarea
              id="description"
              placeholder={t('emergencies.describePlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Ubicación GPS */}
          <div className="space-y-2">
            <Label>{t('emergencies.location')}</Label>
            {gpsLocation ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('emergencies.gpsAuto')}
              </p>
            )}
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleCreateEmergency}
              disabled={submitting}
              className="w-full sm:flex-1 min-h-[44px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('emergencies.creatingLabel')}
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {t('emergencies.create')}
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate(-1)} 
              disabled={submitting}
              className="w-full sm:flex-1 min-h-[44px]"
            >
              {t('common.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
