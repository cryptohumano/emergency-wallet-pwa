/**
 * Componente para mostrar el mapa de la emergencia
 * Usa Leaflet para crear un mapa interactivo que muestra:
 * - La ubicación de la emergencia (marcador rojo)
 * - Si hay log relacionado, traza la ruta completa
 * - El último punto de la ruta es la ubicación de la emergencia
 */

import { useEffect, useRef, useState } from 'react'
import type { Emergency, GPSPoint } from '@/types/emergencies'
import type { MountainLog } from '@/types/mountainLogs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Loader2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMountainLog } from '@/utils/mountainLogStorage'

// Fix para los iconos de Leaflet en React
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Icono rojo para emergencias (usando un marcador rojo personalizado)
const EmergencyIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

interface EmergencyMapProps {
  emergency: Emergency
  className?: string
}

/**
 * Obtiene todos los puntos GPS de un log
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

  // Agregar puntos de rutas
  if (log.routes && log.routes.length > 0) {
    log.routes.forEach(route => {
      if (route.points && route.points.length > 0) {
        points.push(...route.points)
      }
    })
  }

  // Agregar ubicación inicial y final
  if (log.startLocation) {
    points.push({
      latitude: log.startLocation.latitude,
      longitude: log.startLocation.longitude,
      altitude: log.startLocation.altitude,
      accuracy: log.startLocation.accuracy,
      timestamp: log.startDate,
    })
  }
  if (log.endLocation) {
    points.push({
      latitude: log.endLocation.latitude,
      longitude: log.endLocation.longitude,
      altitude: log.endLocation.altitude,
      accuracy: log.endLocation.accuracy,
      timestamp: log.endDate || Date.now(),
    })
  }

  // Eliminar duplicados (misma lat/lon con tolerancia)
  const uniquePoints = points.filter((point, index, self) =>
    index === self.findIndex(p =>
      Math.abs(p.latitude - point.latitude) < 0.0001 &&
      Math.abs(p.longitude - point.longitude) < 0.0001
    )
  )

  // Ordenar por timestamp
  return uniquePoints.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

/**
 * Calcula el zoom apropiado basado en los bounds
 */
function calculateZoom(minLat: number, maxLat: number, minLon: number, maxLon: number): number {
  const latDiff = maxLat - minLat
  const lonDiff = maxLon - minLon
  const maxDiff = Math.max(latDiff, lonDiff)

  if (maxDiff > 10) return 4
  if (maxDiff > 5) return 5
  if (maxDiff > 2) return 6
  if (maxDiff > 1) return 7
  if (maxDiff > 0.5) return 8
  if (maxDiff > 0.25) return 9
  if (maxDiff > 0.1) return 10
  if (maxDiff > 0.05) return 11
  if (maxDiff > 0.025) return 12
  if (maxDiff > 0.01) return 13
  return 14
}

export function EmergencyMap({ emergency, className }: EmergencyMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [loading, setLoading] = useState(false)
  const [log, setLog] = useState<MountainLog | null>(null)

  // Cargar log relacionado si existe
  useEffect(() => {
    const loadLog = async () => {
      if (!emergency.relatedLogId) {
        return
      }

      try {
        setLoading(true)
        const loadedLog = await getMountainLog(emergency.relatedLogId)
        setLog(loadedLog)
      } catch (error) {
        console.error('[EmergencyMap] Error al cargar log:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLog()
  }, [emergency.relatedLogId])

  // Inicializar mapa
  useEffect(() => {
    if (!mapRef.current) {
      console.warn('[EmergencyMap] ⚠️ mapRef.current no está disponible')
      return
    }

    // Verificar que Leaflet esté disponible
    if (typeof L === 'undefined') {
      console.error('[EmergencyMap] ❌ Leaflet no está disponible')
      return
    }

    // Verificar que el contenedor esté en el DOM
    if (!mapRef.current.parentElement) {
      console.warn('[EmergencyMap] ⚠️ Contenedor del mapa no está en el DOM')
      return
    }

    const emergencyLocation = emergency.location
    const center: [number, number] = [emergencyLocation.latitude, emergencyLocation.longitude]

    console.log('[EmergencyMap] 🗺️ Inicializando mapa en:', center)

    // Asegurar que el contenedor tenga altura y esté visible
    if (mapRef.current) {
      mapRef.current.style.height = '256px'
      mapRef.current.style.width = '100%'
      // Asegurar que el contenedor sea visible
      if (mapRef.current.offsetParent === null) {
        console.warn('[EmergencyMap] ⚠️ Contenedor no es visible, esperando...')
        // Esperar a que el contenedor sea visible
        const checkVisibility = setInterval(() => {
          if (mapRef.current && mapRef.current.offsetParent !== null) {
            clearInterval(checkVisibility)
            // Reiniciar el efecto cuando el contenedor sea visible
            setTimeout(() => {
              if (mapRef.current && !mapInstanceRef.current) {
                initializeMap()
              }
            }, 100)
          }
        }, 100)
        return () => clearInterval(checkVisibility)
      }
    }

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) {
        return
      }

      try {
        // Crear mapa
        const map = L.map(mapRef.current, {
          center,
          zoom: 13,
          zoomControl: true,
          // Opciones adicionales para asegurar que se renderice
          preferCanvas: false,
        })

        // Agregar capa de OpenStreetMap
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
          crossOrigin: true,
          noWrap: false,
        })
        
        tileLayer.addTo(map)

        mapInstanceRef.current = map

        console.log('[EmergencyMap] ✅ Mapa inicializado correctamente')

        // Forzar invalidación del tamaño del mapa después de que esté completamente renderizado
        // Usar requestAnimationFrame para asegurar que el DOM esté listo
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (mapInstanceRef.current && mapRef.current) {
              try {
                mapInstanceRef.current.invalidateSize()
                console.log('[EmergencyMap] ✅ Mapa invalidado y tamaño ajustado')
              } catch (error) {
                console.warn('[EmergencyMap] ⚠️ Error al invalidar tamaño del mapa:', error)
              }
            }
          }, 200) // Aumentar delay para asegurar que el mapa esté listo
        })
      } catch (error) {
        console.error('[EmergencyMap] ❌ Error al inicializar mapa:', error)
      }
    }

    initializeMap()

    // Limpiar al desmontar
    return () => {
      console.log('[EmergencyMap] 🧹 Limpiando mapa')
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (error) {
          console.warn('[EmergencyMap] ⚠️ Error al remover mapa:', error)
        }
        mapInstanceRef.current = null
      }
    }
  }, [emergency.location.latitude, emergency.location.longitude]) // Dependencias específicas

  // Actualizar mapa cuando se carga el log o cambia la emergencia
  useEffect(() => {
    if (!mapInstanceRef.current) return

    const map = mapInstanceRef.current
    const emergencyLocation = emergency.location

    // Limpiar marcadores y rutas anteriores
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer)
      }
    })

    let allPoints: GPSPoint[] = []
    let routePoints: [number, number][] = []

    // Si hay log relacionado, obtener todos los puntos GPS
    if (log) {
      allPoints = getAllGPSPoints(log)
      
      // Convertir puntos a coordenadas [lat, lon] para Leaflet
      routePoints = allPoints.map(p => [p.latitude, p.longitude])
      
      // Si hay puntos en la ruta, agregar la ruta al mapa
      if (routePoints.length > 1) {
        const polyline = L.polyline(routePoints, {
          color: '#3b82f6', // Azul para la ruta
          weight: 4,
          opacity: 0.7,
        }).addTo(map)

        // Agregar marcador de inicio (verde)
        if (routePoints.length > 0) {
          const startPoint = routePoints[0]
          const greenIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
            shadowUrl: iconShadow,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
          })
          L.marker(startPoint, { icon: greenIcon })
            .addTo(map)
            .bindPopup('Inicio de la ruta')
        }
      }
    }

    // Agregar marcador de emergencia (rojo) - siempre visible
    const emergencyMarker = L.marker(
      [emergencyLocation.latitude, emergencyLocation.longitude],
      {
        icon: EmergencyIcon,
      }
    ).addTo(map)

    emergencyMarker.bindPopup(`
      <div>
        <strong>🚨 Ubicación de Emergencia</strong><br/>
        Lat: ${emergencyLocation.latitude.toFixed(6)}<br/>
        Lon: ${emergencyLocation.longitude.toFixed(6)}<br/>
        ${emergencyLocation.altitude ? `Altitud: ${emergencyLocation.altitude.toFixed(0)} m<br/>` : ''}
        ${emergencyLocation.accuracy ? `Precisión: ${emergencyLocation.accuracy.toFixed(0)} m` : ''}
      </div>
    `).openPopup()

    // Ajustar vista del mapa
    if (routePoints.length > 0) {
      // Si hay ruta, ajustar para mostrar toda la ruta + emergencia
      const allLatLngs: [number, number][] = [
        ...routePoints,
        [emergencyLocation.latitude, emergencyLocation.longitude]
      ]
      const bounds = L.latLngBounds(allLatLngs)
      map.fitBounds(bounds, { padding: [50, 50] })
    } else {
      // Si no hay ruta, solo centrar en la emergencia
      map.setView([emergencyLocation.latitude, emergencyLocation.longitude], 13)
    }
  }, [log, emergency])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapa de Emergencia
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando ruta del log...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div
              ref={mapRef}
              className="w-full h-64 rounded-md border"
              style={{ minHeight: '256px' }}
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Ubicación de la emergencia</span>
              </div>
              {log && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Inicio de la ruta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-8 bg-blue-500"></div>
                    <span>Ruta del log relacionado</span>
                  </div>
                </>
              )}
            </div>
            {emergency.relatedLogId && !log && (
              <p className="text-xs text-muted-foreground">
                ⚠️ No se pudo cargar el log relacionado (ID: {emergency.relatedLogId})
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
