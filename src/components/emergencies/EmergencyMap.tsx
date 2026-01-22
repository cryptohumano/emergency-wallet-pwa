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

    const emergencyLocation = emergency.location
    const center: [number, number] = [emergencyLocation.latitude, emergencyLocation.longitude]

    console.log('[EmergencyMap] 🗺️ Inicializando mapa en:', center)

    // Asegurar que el contenedor tenga altura y ancho explícitos
    if (mapRef.current) {
      mapRef.current.style.height = '256px'
      mapRef.current.style.width = '100%'
      mapRef.current.style.minHeight = '256px'
      mapRef.current.style.display = 'block'
    }

    // Función para inicializar el mapa
    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) {
        return false
      }

      // Verificar que el contenedor tenga dimensiones antes de inicializar
      const rect = mapRef.current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        console.warn('[EmergencyMap] ⚠️ Contenedor sin dimensiones, esperando...')
        return false
      }

      try {
        // Crear mapa con z-index bajo para no superponer header
        // El header tiene z-40, el mapa debe estar al mismo nivel que el contenido
        const map = L.map(mapRef.current!, {
          center,
          zoom: 13,
          zoomControl: true,
          preferCanvas: false,
          // Asegurar que el mapa tenga z-index bajo
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        })
        
        // Establecer z-index explícitamente en el contenedor del mapa
        if (mapRef.current) {
          mapRef.current.style.position = 'relative'
          mapRef.current.style.zIndex = '10'
        }

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

        // Agregar marcador de emergencia inmediatamente después de inicializar el mapa
        // Esto asegura que siempre esté visible, independientemente del estado del log
        const emergencyLocation = emergency.location
        if (
          emergencyLocation &&
          typeof emergencyLocation.latitude === 'number' &&
          typeof emergencyLocation.longitude === 'number' &&
          !isNaN(emergencyLocation.latitude) &&
          !isNaN(emergencyLocation.longitude)
        ) {
          try {
            const initialMarker = L.marker(
              [emergencyLocation.latitude, emergencyLocation.longitude],
              {
                icon: EmergencyIcon,
                zIndexOffset: 1000,
                interactive: true,
                keyboard: true,
                title: 'Ubicación de Emergencia',
              }
            ).addTo(map)

            initialMarker.bindPopup(`
              <div>
                <strong>🚨 Ubicación de Emergencia</strong><br/>
                Lat: ${emergencyLocation.latitude.toFixed(6)}<br/>
                Lon: ${emergencyLocation.longitude.toFixed(6)}<br/>
                ${emergencyLocation.altitude ? `Altitud: ${emergencyLocation.altitude.toFixed(0)} m<br/>` : ''}
                ${emergencyLocation.accuracy ? `Precisión: ${emergencyLocation.accuracy.toFixed(0)} m` : ''}
              </div>
            `)

            // Guardar referencia
            emergencyMarkerRef.current = initialMarker

            // Centrar el mapa en la emergencia
            map.setView([emergencyLocation.latitude, emergencyLocation.longitude], 13)

            console.log('[EmergencyMap] ✅ Marcador de emergencia agregado durante inicialización')
          } catch (error) {
            console.error('[EmergencyMap] ❌ Error al agregar marcador inicial:', error)
          }
        }

        // Invalidar tamaño después de que el mapa esté listo
        // Usar múltiples requestAnimationFrame para asegurar que el DOM esté completamente renderizado
        const invalidateSize = () => {
          if (mapInstanceRef.current && mapRef.current) {
            try {
              // Verificar que el contenedor tenga dimensiones antes de invalidar
              const rect = mapRef.current.getBoundingClientRect()
              if (rect.width > 0 && rect.height > 0) {
                mapInstanceRef.current.invalidateSize()
                console.log('[EmergencyMap] ✅ Mapa invalidado y tamaño ajustado')
              } else {
                // Si no tiene dimensiones, intentar de nuevo
                setTimeout(invalidateSize, 100)
              }
            } catch (error) {
              console.warn('[EmergencyMap] ⚠️ Error al invalidar tamaño del mapa:', error)
            }
          }
        }

        // Intentar invalidar después de que el DOM esté listo
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(invalidateSize, 100)
          })
        })

        return true
      } catch (error) {
        console.error('[EmergencyMap] ❌ Error al inicializar mapa:', error)
        return false
      }
    }

    // Esperar a que el DOM esté completamente renderizado
    const initTimeout = setTimeout(() => {
      // Verificar que el contenedor esté en el DOM y tenga dimensiones
      if (mapRef.current && mapRef.current.parentElement) {
        const rect = mapRef.current.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          initializeMap()
        } else {
          // Si aún no tiene dimensiones, intentar con un delay adicional
          setTimeout(() => {
            if (!mapInstanceRef.current && mapRef.current) {
              initializeMap()
            }
          }, 200)
        }
      }
    }, 50)

    // Limpiar al desmontar
    return () => {
      clearTimeout(initTimeout)
      console.log('[EmergencyMap] 🧹 Limpiando mapa')
      if (emergencyMarkerRef.current) {
        try {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(emergencyMarkerRef.current)
          }
        } catch (error) {
          console.warn('[EmergencyMap] ⚠️ Error al remover marcador:', error)
        }
        emergencyMarkerRef.current = null
      }
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

  // Referencia para el marcador de emergencia (para poder limpiarlo correctamente)
  const emergencyMarkerRef = useRef<L.Marker | null>(null)

  // Actualizar mapa cuando se carga el log o cambia la emergencia
  useEffect(() => {
    if (!mapInstanceRef.current) {
      console.warn('[EmergencyMap] ⚠️ Mapa no está inicializado, esperando...')
      // Intentar de nuevo después de un delay
      const retryTimeout = setTimeout(() => {
        if (mapInstanceRef.current) {
          // Forzar re-ejecución del efecto
          console.log('[EmergencyMap] 🔄 Reintentando agregar marcadores...')
        }
      }, 500)
      return () => clearTimeout(retryTimeout)
    }

    // Verificar que el mapa esté completamente inicializado
    if (!mapInstanceRef.current.getContainer()) {
      console.warn('[EmergencyMap] ⚠️ Contenedor del mapa no está disponible')
      return
    }

    const map = mapInstanceRef.current
    const emergencyLocation = emergency.location

    // Validar que las coordenadas sean válidas
    if (
      !emergencyLocation ||
      typeof emergencyLocation.latitude !== 'number' ||
      typeof emergencyLocation.longitude !== 'number' ||
      isNaN(emergencyLocation.latitude) ||
      isNaN(emergencyLocation.longitude)
    ) {
      console.error('[EmergencyMap] ❌ Coordenadas de emergencia inválidas:', emergencyLocation)
      return
    }

    console.log('[EmergencyMap] 🗺️ Actualizando marcadores para emergencia en:', [
      emergencyLocation.latitude,
      emergencyLocation.longitude
    ])

    // Limpiar marcadores y rutas anteriores (excepto las capas de tiles y el marcador de emergencia)
    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline) {
        map.removeLayer(layer)
      } else if (layer instanceof L.Marker && layer !== emergencyMarkerRef.current) {
        // No remover el marcador de emergencia si ya existe
        map.removeLayer(layer)
      }
    })

    // Si el marcador de emergencia ya existe, actualizar su posición si es necesario
    if (emergencyMarkerRef.current && map.hasLayer(emergencyMarkerRef.current)) {
      const currentLatLng = emergencyMarkerRef.current.getLatLng()
      const newLatLng: [number, number] = [emergencyLocation.latitude, emergencyLocation.longitude]
      
      // Solo actualizar si las coordenadas son diferentes
      if (
        Math.abs(currentLatLng.lat - newLatLng[0]) > 0.0001 ||
        Math.abs(currentLatLng.lng - newLatLng[1]) > 0.0001
      ) {
        emergencyMarkerRef.current.setLatLng(newLatLng)
        console.log('[EmergencyMap] ✅ Posición del marcador de emergencia actualizada')
      }
    } else {
      // Si no existe, limpiar referencia
      if (emergencyMarkerRef.current) {
        emergencyMarkerRef.current = null
      }
    }

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

    // Agregar marcador de emergencia (rojo) - SIEMPRE visible
    try {
      const emergencyMarker = L.marker(
        [emergencyLocation.latitude, emergencyLocation.longitude],
        {
          icon: EmergencyIcon,
          zIndexOffset: 1000, // Asegurar que esté por encima de otros marcadores
          interactive: true,
          keyboard: true,
          title: 'Ubicación de Emergencia',
        }
      ).addTo(map)

      // Verificar que el marcador se agregó correctamente
      if (!map.hasLayer(emergencyMarker)) {
        console.error('[EmergencyMap] ❌ El marcador no se agregó al mapa')
        // Intentar agregar de nuevo con el icono por defecto
        emergencyMarker.setIcon(DefaultIcon)
        if (!map.hasLayer(emergencyMarker)) {
          console.error('[EmergencyMap] ❌ Fallo al agregar marcador incluso con icono por defecto')
        }
      }

      emergencyMarker.bindPopup(`
        <div>
          <strong>🚨 Ubicación de Emergencia</strong><br/>
          Lat: ${emergencyLocation.latitude.toFixed(6)}<br/>
          Lon: ${emergencyLocation.longitude.toFixed(6)}<br/>
          ${emergencyLocation.altitude ? `Altitud: ${emergencyLocation.altitude.toFixed(0)} m<br/>` : ''}
          ${emergencyLocation.accuracy ? `Precisión: ${emergencyLocation.accuracy.toFixed(0)} m` : ''}
        </div>
      `)

      // Abrir popup después de un pequeño delay para asegurar que el marcador esté renderizado
      setTimeout(() => {
        if (emergencyMarker && map.hasLayer(emergencyMarker)) {
          emergencyMarker.openPopup()
        }
      }, 100)

      // Guardar referencia para poder limpiarlo después
      emergencyMarkerRef.current = emergencyMarker

      console.log('[EmergencyMap] ✅ Marcador de emergencia agregado correctamente en:', [
        emergencyLocation.latitude,
        emergencyLocation.longitude
      ])
    } catch (error) {
      console.error('[EmergencyMap] ❌ Error al agregar marcador de emergencia:', error)
      // Intentar agregar un marcador simple como último recurso
      try {
        const simpleMarker = L.marker(
          [emergencyLocation.latitude, emergencyLocation.longitude],
          { icon: DefaultIcon }
        ).addTo(map)
        emergencyMarkerRef.current = simpleMarker
        console.log('[EmergencyMap] ✅ Marcador de emergencia agregado con icono por defecto')
      } catch (fallbackError) {
        console.error('[EmergencyMap] ❌ Error crítico al agregar marcador:', fallbackError)
      }
    }

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
  }, [log, emergency, emergency.location.latitude, emergency.location.longitude])

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
              className="w-full h-64 rounded-md border relative"
              style={{ 
                minHeight: '256px',
                zIndex: 10, // Mismo nivel que el contenido, no por encima del header (z-40)
                isolation: 'isolate', // Crear nuevo contexto de apilamiento
              }}
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
