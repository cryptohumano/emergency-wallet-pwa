/**
 * Componente: Botón de Emergencia
 * Permite activar una emergencia desde la bitácora
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import type { MountainLog } from '@/types/mountainLogs'

interface EmergencyButtonProps {
  log: MountainLog
  currentLocation?: GPSPoint | null
  onEmergencyCreated?: (emergencyId: string) => void
}

export function EmergencyButton({ 
  log, 
  currentLocation: propCurrentLocation,
  onEmergencyCreated 
}: EmergencyButtonProps) {
  const [open, setOpen] = useState(false)
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
  
  // Usar ubicación proporcionada o GPS actual
  const currentLocation = propCurrentLocation || gpsLocation

  const handleCreateEmergency = async () => {
    console.log('[EmergencyButton] Iniciando creación de emergencia...')
    
    if (!description.trim() && severity !== 'critical') {
      toast.error('Por favor, proporciona una descripción de la emergencia')
      return
    }

    // Obtener ubicación
    let location: GPSPoint | null = currentLocation

    // Si no hay ubicación, intentar obtenerla
    if (!location) {
      try {
        // Intentar obtener ubicación usando el hook
        if (hasPermission) {
          try {
            await addManualPoint()
            // Esperar un momento para que se actualice currentLocation
            await new Promise(resolve => setTimeout(resolve, 500))
            location = gpsLocation
          } catch (error) {
            console.warn('[EmergencyButton] Error al obtener ubicación con addManualPoint:', error)
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
            altitude: position.coords.altitude || undefined,
            accuracy: position.coords.accuracy,
            timestamp: Date.now(),
          }
        }
      } catch (error) {
        console.warn('[EmergencyButton] No se pudo obtener ubicación GPS:', error)
        
        // Usar última ubicación conocida de la bitácora
        if (log.startLocation) {
          location = {
            latitude: log.startLocation.latitude,
            longitude: log.startLocation.longitude,
            altitude: log.startLocation.altitude,
            accuracy: log.startLocation.accuracy,
            timestamp: Date.now(),
          }
          toast.warning('Usando ubicación inicial de la bitácora (GPS no disponible)')
        } else if (log.milestones && log.milestones.length > 0) {
          // Usar ubicación del último milestone
          const lastMilestone = log.milestones[log.milestones.length - 1]
          if (lastMilestone.gpsPoint) {
            location = {
              ...lastMilestone.gpsPoint,
              timestamp: Date.now(),
            }
            toast.warning('Usando ubicación del último milestone (GPS no disponible)')
          } else {
            toast.error('No se pudo obtener la ubicación. Por favor, activa el GPS o agrega un milestone con ubicación.')
            return
          }
        } else {
          toast.error('No se pudo obtener la ubicación. Por favor, activa el GPS.')
          return
        }
      }
    }

    if (!location) {
      toast.error('No se pudo obtener la ubicación')
      return
    }

    try {
      setSubmitting(true)

      // Obtener contactos de emergencia del Aviso de Salida
      const emergencyContacts = log.avisoSalida?.contactosEmergencia || []

      // Obtener milestone actual (último milestone)
      const currentMilestone = log.milestones && log.milestones.length > 0
        ? log.milestones[log.milestones.length - 1]
        : null

      // Usar la cuenta de la bitácora si está disponible, de lo contrario usar la primera cuenta
      const accountAddress = log.relatedAccount || undefined

      // Preparar datos de la bitácora para incluir en el remark
      const logDataForRemark = {
        title: log.title,
        mountainName: log.mountainName,
        location: log.location,
        startDate: log.startDate,
        avisoSalida: log.avisoSalida ? {
          guia: log.avisoSalida.guia ? {
            nombres: log.avisoSalida.guia.nombres,
            apellidos: log.avisoSalida.guia.apellidos,
          } : undefined,
          actividad: log.avisoSalida.actividad ? {
            lugarDestino: log.avisoSalida.actividad.lugarDestino,
            numeroParticipantes: log.avisoSalida.actividad.numeroParticipantes,
            fechaSalida: log.avisoSalida.actividad.fechaSalida,
            tipoActividad: log.avisoSalida.actividad.tipoActividad,
          } : undefined,
        } : undefined,
        routes: log.routes?.map(route => ({
          name: route.name,
          distance: route.distance,
        })),
        milestones: log.milestones?.map(m => ({
          id: m.id,
          title: m.title,
          type: m.type,
          metadata: m.metadata ? {
            elevation: m.metadata.elevation,
          } : undefined,
        })),
      }

      const emergency = await createAndSubmitEmergency({
        type,
        severity,
        description: description.trim() || `Emergencia ${type} durante bitácora`,
        location,
        relatedLogId: log.logId,
        relatedMilestoneId: currentMilestone?.id,
        emergencyContacts,
        metadata: {
          mountainName: log.mountainName,
          location: log.location,
          participantsCount: log.avisoSalida?.actividad?.numeroParticipantes,
        },
      }, accountAddress, logDataForRemark)

      if (emergency) {
        toast.success('Emergencia creada y enviada', {
          description: 'La emergencia ha sido registrada en la blockchain',
        })
        setOpen(false)
        setDescription('')
        onEmergencyCreated?.(emergency.emergencyId)
      }
    } catch (error) {
      console.error('[EmergencyButton] Error:', error)
      toast.error('Error al crear emergencia', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="lg"
          className="w-full sm:w-auto gap-2 critical-glow button-tactile relative overflow-hidden group"
          disabled={!log.milestones || log.milestones.length === 0}
          title={(!log.milestones || log.milestones.length === 0) ? 'Agrega al menos un milestone antes de activar una emergencia' : 'Activar emergencia'}
        >
          <span className="relative z-10 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            EMERGENCIA
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Activar Emergencia
          </DialogTitle>
          <DialogDescription>
            Esta acción enviará una alerta de emergencia a la blockchain.
            Solo úsala en situaciones reales de emergencia.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="emergency-type">Tipo de Emergencia *</Label>
            <Select value={type} onValueChange={(value) => setType(value as EmergencyType)}>
              <SelectTrigger id="emergency-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medical">Médica</SelectItem>
                <SelectItem value="rescue">Rescate</SelectItem>
                <SelectItem value="weather">Condiciones Climáticas</SelectItem>
                <SelectItem value="equipment">Fallo de Equipo</SelectItem>
                <SelectItem value="lost">Extraviado</SelectItem>
                <SelectItem value="injury">Lesión</SelectItem>
                <SelectItem value="illness">Enfermedad</SelectItem>
                <SelectItem value="avalanche">Avalancha</SelectItem>
                <SelectItem value="rockfall">Caída de Rocas</SelectItem>
                <SelectItem value="other">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency-severity">Severidad *</Label>
            <Select value={severity} onValueChange={(value) => setSeverity(value as EmergencySeverity)}>
              <SelectTrigger id="emergency-severity">
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

          <div className="space-y-2">
            <Label htmlFor="emergency-description">
              Descripción {severity !== 'critical' && '*'}
            </Label>
            <Textarea
              id="emergency-description"
              placeholder="Describe brevemente la situación de emergencia..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            {severity === 'critical' && (
              <p className="text-xs text-muted-foreground">
                Para emergencias críticas, la descripción es opcional pero recomendada.
              </p>
            )}
          </div>

          {currentLocation && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              📍 Ubicación: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              {currentLocation.altitude && ` (${Math.round(currentLocation.altitude)}m)`}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCreateEmergency}
              disabled={submitting}
              className="flex-1 critical-glow button-tactile"
            >
              {submitting ? 'Enviando...' : 'Confirmar Emergencia'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
