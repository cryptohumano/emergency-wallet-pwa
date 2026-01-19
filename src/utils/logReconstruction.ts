/**
 * Utilidades para reconstruir logs de montaña a partir de datos de emergencias
 * Cuando se recibe una emergencia desde blockchain, el log relacionado no existe
 * en la wallet del receptor, pero podemos reconstruirlo con los datos del remark
 */

import type { EmergencyRemarkData } from '@/types/emergencies'
import type { MountainLog, MountainLogMilestone, GPSPoint } from '@/types/mountainLogs'
import { v4 as uuidv4 } from 'uuid'

/**
 * Reconstruye un log de montaña a partir de los datos de una emergencia
 * Crea un log mínimo pero útil para visualización y contexto
 */
export function reconstructLogFromEmergencyRemark(
  remarkData: EmergencyRemarkData,
  reporterAccount: string
): MountainLog | null {
  if (!remarkData.relatedLogId) {
    console.log('[Log Reconstruction] ⚠️ No hay relatedLogId en remarkData')
    return null
  }

  const metadata = remarkData.metadata || {}
  const location = remarkData.location

  // Crear un milestone para la ubicación de la emergencia
  const emergencyMilestone: MountainLogMilestone = {
    id: remarkData.relatedMilestoneId || uuidv4(),
    timestamp: location.timestamp || Date.now(),
    title: metadata.milestone?.title || 'Ubicación de Emergencia',
    type: 'checkpoint',
    gpsPoint: {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || Date.now(),
    },
    images: [],
    order: 0,
    metadata: {
      elevation: location.altitude,
      ...metadata.milestone,
    },
    notes: `Emergencia: ${remarkData.type} - ${remarkData.severity}\n${remarkData.description}`,
  }

  // Crear punto GPS inicial (si hay datos de aviso de salida)
  const startLocation: GPSPoint | undefined = metadata.avisoSalida?.fechaSalida
    ? {
        latitude: location.latitude, // Usar ubicación de emergencia como aproximación
        longitude: location.longitude,
        altitude: location.altitude,
        accuracy: location.accuracy,
        timestamp: metadata.avisoSalida.fechaSalida,
      }
    : undefined

  // Crear log reconstruido
  const reconstructedLog: MountainLog = {
    logId: remarkData.relatedLogId, // Usar el ID original del log
    title: metadata.logTitle || metadata.mountainName || 'Log de Emergencia',
    mountainName: metadata.mountainName,
    location: metadata.logLocation,
    status: 'completed', // Asumir completado ya que hay emergencia
    startDate: metadata.logStartDate || metadata.avisoSalida?.fechaSalida || location.timestamp,
    endDate: location.timestamp, // La emergencia marca el fin
    createdAt: remarkData.createdAt || Date.now(),
    updatedAt: Date.now(),
    
    // Ubicación inicial (aproximada)
    startLocation: startLocation,
    
    // Ubicación final (ubicación de la emergencia)
    endLocation: {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: location.altitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp || Date.now(),
    },
    
    // Milestones (solo el de la emergencia por ahora)
    milestones: [emergencyMilestone],
    
    // Rutas (si hay datos de trail)
    routes: metadata.trail?.name
      ? [
          {
            id: uuidv4(),
            name: metadata.trail.name,
            description: `Ruta relacionada con emergencia ${remarkData.emergencyId}`,
            points: [
              // Punto inicial aproximado
              {
                latitude: location.latitude,
                longitude: location.longitude,
                altitude: location.altitude,
                accuracy: location.accuracy,
                timestamp: metadata.logStartDate || location.timestamp,
              },
              // Punto de emergencia
              {
                latitude: location.latitude,
                longitude: location.longitude,
                altitude: location.altitude,
                accuracy: location.accuracy,
                timestamp: location.timestamp || Date.now(),
              },
            ],
            totalDistance: metadata.trail.distance,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]
      : [],
    
    // Entradas (vacías por ahora, se pueden agregar después)
    entries: [],
    
    // GPS Points (solo la ubicación de la emergencia)
    gpsPoints: [
      {
        latitude: location.latitude,
        longitude: location.longitude,
        altitude: location.altitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp || Date.now(),
      },
    ],
    
    // Aviso de salida (reconstruido desde metadata)
    avisoSalida: metadata.avisoSalida
      ? {
          guia: metadata.avisoSalida.guiaNombre
            ? {
                nombres: metadata.avisoSalida.guiaNombre,
              }
            : undefined,
          actividad: {
            lugarDestino: metadata.avisoSalida.lugarDestino,
            numeroParticipantes: metadata.avisoSalida.numeroParticipantes,
            fechaSalida: metadata.avisoSalida.fechaSalida,
            tipoActividad: metadata.avisoSalida.tipoActividad,
          },
        }
      : undefined,
    
    // Metadata adicional
    metadata: {
      reconstructed: true, // Marcar como reconstruido
      reconstructedFrom: 'emergency-remark',
      originalReporter: reporterAccount,
      emergencyId: remarkData.emergencyId,
      reconstructedAt: Date.now(),
      ...metadata,
    },
    
    // Imágenes (vacías)
    images: [],
    
    // Tracking
    trackingMode: 'manual',
    isTracking: false,
  }

  console.log('[Log Reconstruction] ✅ Log reconstruido:', {
    logId: reconstructedLog.logId,
    title: reconstructedLog.title,
    milestones: reconstructedLog.milestones.length,
    routes: reconstructedLog.routes.length,
  })

  return reconstructedLog
}
