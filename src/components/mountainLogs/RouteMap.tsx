/**
 * Componente para mostrar el mapa de la ruta de la bitácora
 */

import { useEffect, useRef, useState } from 'react'
import type { MountainLog, GPSPoint } from '@/types/mountainLogs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin } from 'lucide-react'

interface RouteMapProps {
  log: MountainLog
  className?: string
}

/**
 * Genera una URL de mapa estático usando OpenStreetMap
 */
function generateStaticMapUrl(points: GPSPoint[]): string {
  if (points.length === 0) return ''

  // Calcular centro y bounds
  const lats = points.map(p => p.latitude)
  const lons = points.map(p => p.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const centerLat = (minLat + maxLat) / 2
  const centerLon = (minLon + maxLon) / 2

  // Construir polyline para la ruta
  const polyline = points.map(p => `${p.latitude},${p.longitude}`).join('|')

  // Usar OpenStreetMap Static API (gratuita, sin API key)
  // Formato: https://staticmap.openstreetmap.de/staticmap.php?center=LAT,LON&zoom=ZOOM&size=WIDTHxHEIGHT&markers=LAT,LON|LAT,LON
  const zoom = calculateZoom(minLat, maxLat, minLon, maxLon)
  const width = 800
  const height = 600

  // Construir URL con marcadores y polyline
  const markers = points
    .filter((_, i) => i === 0 || i === points.length - 1) // Solo inicio y fin
    .map(p => `${p.latitude},${p.longitude}`)
    .join('|')

  // Usar una API alternativa: OpenStreetMap con Overpass o usar un servicio de mapas estáticos
  // Por ahora usaremos una solución simple con OpenStreetMap Static Map
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${centerLat},${centerLon}&zoom=${zoom}&size=${width}x${height}&markers=${markers}`

  return url
}

/**
 * Calcula el zoom apropiado basado en los bounds
 */
function calculateZoom(minLat: number, maxLat: number, minLon: number, maxLon: number): number {
  const latDiff = maxLat - minLat
  const lonDiff = maxLon - minLon
  const maxDiff = Math.max(latDiff, lonDiff)

  if (maxDiff > 10) return 5
  if (maxDiff > 5) return 6
  if (maxDiff > 2) return 7
  if (maxDiff > 1) return 8
  if (maxDiff > 0.5) return 9
  if (maxDiff > 0.2) return 10
  if (maxDiff > 0.1) return 11
  if (maxDiff > 0.05) return 12
  if (maxDiff > 0.02) return 13
  return 14
}

/**
 * Obtiene todos los puntos GPS de la bitácora
 */
function getAllGPSPoints(log: MountainLog): GPSPoint[] {
  const points: GPSPoint[] = []

  // Agregar puntos de milestones
  if (log.milestones) {
    log.milestones.forEach(milestone => {
      if (milestone.gpsPoint) {
        points.push(milestone.gpsPoint)
      }
    })
  }

  // Agregar puntos de tracking GPS
  if (log.gpsPoints && log.gpsPoints.length > 0) {
    points.push(...log.gpsPoints)
  }

  // Agregar ubicación inicial y final
  if (log.startLocation) {
    points.push({
      ...log.startLocation,
      timestamp: log.startDate,
    })
  }
  if (log.endLocation) {
    points.push({
      ...log.endLocation,
      timestamp: log.endDate || Date.now(),
    })
  }

  // Eliminar duplicados (misma lat/lon)
  const uniquePoints = points.filter((point, index, self) =>
    index === self.findIndex(p =>
      Math.abs(p.latitude - point.latitude) < 0.0001 &&
      Math.abs(p.longitude - point.longitude) < 0.0001
    )
  )

  // Ordenar por timestamp
  return uniquePoints.sort((a, b) => a.timestamp - b.timestamp)
}

export function RouteMap({ log, className }: RouteMapProps) {
  const [mapUrl, setMapUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const points = getAllGPSPoints(log)
    
    if (points.length === 0) {
      setLoading(false)
      return
    }

    // Generar URL del mapa estático
    const url = generateStaticMapUrl(points)
    setMapUrl(url)
    setLoading(false)
  }, [log])

  const points = getAllGPSPoints(log)

  if (points.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Mapa de la Ruta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay puntos GPS disponibles para mostrar en el mapa.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa de la Ruta
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-muted-foreground">Cargando mapa...</p>
          </div>
        ) : mapUrl ? (
          <div className="space-y-2">
            <img
              src={mapUrl}
              alt="Mapa de la ruta"
              className="w-full h-auto rounded-lg border"
              onError={() => {
                // Fallback si la imagen no carga
                setMapUrl('')
              }}
            />
            <p className="text-xs text-muted-foreground text-center">
              {points.length} punto{points.length !== 1 ? 's' : ''} GPS registrado{points.length !== 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              No se pudo cargar el mapa. {points.length} punto{points.length !== 1 ? 's' : ''} GPS disponible{points.length !== 1 ? 's' : ''}.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Genera una imagen del mapa en base64 para incluir en el PDF
 */
export async function generateMapImageBase64(log: MountainLog): Promise<string | null> {
  const points = getAllGPSPoints(log)
  
  if (points.length === 0) {
    return null
  }

  try {
    const mapUrl = generateStaticMapUrl(points)
    
    // Crear un AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos timeout
    
    try {
      // Convertir la imagen del mapa a base64 con timeout
      const response = await fetch(mapUrl, {
        signal: controller.signal,
        mode: 'cors',
        cache: 'no-cache',
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`)
      }
      
      const blob = await response.blob()
      
      // Verificar que sea una imagen válida
      if (!blob.type.startsWith('image/')) {
        throw new Error('La respuesta no es una imagen válida')
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = reader.result as string
          resolve(base64)
        }
        reader.onerror = () => {
          reject(new Error('Error al leer el blob de la imagen'))
        }
        reader.readAsDataURL(blob)
      })
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout al cargar el mapa (10 segundos)')
        }
        throw fetchError
      }
      throw new Error('Error desconocido al cargar el mapa')
    }
  } catch (error) {
    console.warn('[RouteMap] No se pudo generar imagen del mapa:', error)
    // Retornar null en lugar de lanzar error - el PDF se generará sin el mapa
    return null
  }
}
