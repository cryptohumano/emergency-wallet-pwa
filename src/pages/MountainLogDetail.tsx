import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  getMountainLog, 
  saveMountainLog,
  updateMountainLogStatus,
  type MountainLog 
} from '@/utils/mountainLogStorage'
import { useGPSTracking } from '@/hooks/useGPSTracking'
import { 
  Save, 
  Camera, 
  MapPin, 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  ArrowLeft,
  CheckCircle,
  Tent,
  Mountain as MountainIcon,
  Image as ImageIcon,
  FileText,
  X,
  Clock,
  Navigation,
  Info,
  Download,
  PenTool
} from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import type { MountainLogStatus, MountainLogMilestone, MountainLogImage, GPSPoint, GPSMetadata } from '@/types/mountainLogs'
import { validateGPSPoint } from '@/utils/gpsValidation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AvisoSalidaForm } from '@/components/mountainLogs/AvisoSalidaForm'
import { AvisoSalidaView } from '@/components/mountainLogs/AvisoSalidaView'
import { PlaneacionForm } from '@/components/mountainLogs/PlaneacionForm'
import { ImageGallery } from '@/components/mountainLogs/ImageGallery'
import { RouteMap } from '@/components/mountainLogs/RouteMap'
import PhotoCapture from '@/components/documents/PhotoCapture'
import { generateMountainLogPDF } from '@/services/mountainLogs/mountainLogPDFGenerator'
import { downloadPDF } from '@/utils/pdfUtils'
import SignatureSelector from '@/components/signatures/SignatureSelector'
import type { Document } from '@/types/documents'
import { createDocumentFromPDF } from '@/services/documents/DocumentService'
import { signDocumentWithSubstrate } from '@/services/signatures/SubstrateSigner'
import { useKeyringContext } from '@/contexts/KeyringContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function MountainLogDetail() {
  const { logId } = useParams<{ logId: string }>()
  const navigate = useNavigate()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showCameraDialog, setShowCameraDialog] = useState(false)
  const [currentMilestoneForImage, setCurrentMilestoneForImage] = useState<string | null>(null)
  // Estado para mantener milestoneId durante el proceso de captura (iOS puede perder el atributo)
  const milestoneIdForCapture = useRef<string | null>(null)

  // Detectar si es dispositivo móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  const [showAddMilestone, setShowAddMilestone] = useState(false)

  const [log, setLog] = useState<MountainLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPlaneacion, setShowPlaneacion] = useState(false)
  const [showAvisoSalida, setShowAvisoSalida] = useState(false)
  const [showAvisoSalidaView, setShowAvisoSalidaView] = useState(false)
  const [selectedMilestoneDescription, setSelectedMilestoneDescription] = useState<{ title: string; description: string } | null>(null)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [document, setDocument] = useState<Document | null>(null)
  const { accounts, getAccount } = useKeyringContext()

  // Form state para nuevo milestone
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneType, setNewMilestoneType] = useState<MountainLogMilestone['type']>('checkpoint')
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('')

  // GPS Tracking
  const {
    currentLocation,
    isTracking,
    points: gpsPoints,
    startTracking,
    stopTracking,
    addManualPoint,
    error: gpsError,
    hasPermission
  } = useGPSTracking({
    enabled: false,
    interval: 5000,
    highAccuracy: true
  })

  useEffect(() => {
    if (logId) {
      loadLog()
    } else {
      // Crear nueva bitácora - mostrar formulario de Aviso de Salida
      const newLog: MountainLog = {
        logId: uuidv4(),
        title: 'Nueva Bitácora',
        description: '',
        status: 'draft',
        startDate: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        trackingMode: 'manual',
        isTrackingActive: false,
        routes: [],
        milestones: [],
        entries: [],
        images: [],
        gpsPoints: [],
        synced: false
      }
      setLog(newLog)
      // Mostrar planeación primero (opcional)
      setShowPlaneacion(true)
      setLoading(false)
    }
  }, [logId])

  const loadLog = async () => {
    if (!logId) return
    try {
      setLoading(true)
      const loadedLog = await getMountainLog(logId)
      if (!loadedLog) {
        toast.error('Bitácora no encontrada')
        navigate('/mountain-logs')
        return
      }
      // Asegurar que milestones existe
      if (!loadedLog.milestones) {
        loadedLog.milestones = []
      }
      setLog(loadedLog)
    } catch (error) {
      console.error('Error al cargar bitácora:', error)
      toast.error('Error al cargar la bitácora')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!log) return

    try {
      setSaving(true)
      const updatedLog: MountainLog = {
        ...log,
        updatedAt: Date.now(),
        gpsPoints: isTracking ? [...gpsPoints] : log.gpsPoints
      }

      // Calcular y actualizar estadísticas
      const { updateMountainLogStatistics } = await import('@/utils/mountainLogStatistics')
      const logWithStats = updateMountainLogStatistics(updatedLog)

      await saveMountainLog(logWithStats)
      setLog(logWithStats)
      toast.success('Bitácora guardada')
    } catch (error) {
      console.error('Error al guardar bitácora:', error)
      toast.error('Error al guardar la bitácora')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalize = async () => {
    if (!log) return

    if (!confirm('¿Estás seguro de que deseas finalizar esta bitácora? No podrás agregar más milestones.')) {
      return
    }

    try {
      setSaving(true)
      if (isTracking) {
        stopTracking()
      }
      
      // Calcular estadísticas finales antes de finalizar
      const { updateMountainLogStatistics } = await import('@/utils/mountainLogStatistics')
      const logWithStats = updateMountainLogStatistics({
        ...log,
        endDate: Date.now(),
        gpsPoints: isTracking ? [...gpsPoints] : log.gpsPoints,
        isTrackingActive: false,
      })

      // Guardar con estadísticas actualizadas
      await saveMountainLog(logWithStats)
      
      // Actualizar estado a completado
      await updateMountainLogStatus(log.logId, 'completed', Date.now())
      await loadLog()
      toast.success('Bitácora finalizada')
    } catch (error) {
      console.error('Error al finalizar bitácora:', error)
      toast.error('Error al finalizar la bitácora')
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (!log) return

    try {
      setExportingPDF(true)
      toast.info('Generando PDF...')

      // Calcular estadísticas antes de generar el PDF
      const { updateMountainLogStatistics } = await import('@/utils/mountainLogStatistics')
      const logWithStats = updateMountainLogStatistics({
        ...log,
        gpsPoints: isTracking ? [...gpsPoints] : log.gpsPoints,
      })

      // Guardar bitácora con estadísticas actualizadas
      await saveMountainLog(logWithStats)
      setLog(logWithStats)

      // Obtener nombre de la cuenta si está disponible
      let authorName = logWithStats.relatedAccount || ''
      if (logWithStats.relatedAccount) {
        const account = getAccount(logWithStats.relatedAccount)
        if (account?.meta?.name) {
          authorName = account.meta.name
        }
      }

      const { pdfBase64, pdfHash } = await generateMountainLogPDF({
        log: logWithStats,
        includeImages: true, // Incluir imágenes en el PDF
        authorName, // Pasar el nombre del autor
      })

      // Crear documento en el sistema de documentos (guardar primero)
      const doc = await createDocumentFromPDF({
        type: 'mountain_log',
        category: 'expediciones',
        subcategory: 'montañismo',
        pdfBase64,
        metadata: {
          title: logWithStats.title || 'Bitácora de Montañismo',
          description: logWithStats.description || `Bitácora de ${logWithStats.mountainName || logWithStats.location || 'montañismo'}`,
          author: authorName,
          subject: 'Bitácora de Montañismo',
          keywords: ['montañismo', 'bitácora', 'expedición', logWithStats.mountainName || '', logWithStats.location || ''].filter(Boolean),
        },
        gpsMetadata: logWithStats.startLocation,
        relatedAccount: logWithStats.relatedAccount,
      })

      setDocument(doc)
      toast.success('PDF generado y guardado. Ahora puedes firmarlo.')

      // Descargar el PDF sin firmar
      const filename = `${logWithStats.title || 'bitacora'}_${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(pdfBase64, filename)
    } catch (error) {
      console.error('Error al exportar PDF:', error)
      toast.error('Error al generar el PDF')
    } finally {
      setExportingPDF(false)
    }
  }

  const handleSignDocument = async (updatedDocument: Document) => {
    setDocument(updatedDocument)
    setShowSignDialog(false)
    
    // Verificar que tenga ambas firmas (Substrate y autográfica)
    const hasSubstrateSignature = updatedDocument.signatures?.some(sig => sig.type === 'substrate')
    const hasAutographicSignature = updatedDocument.signatures?.some(sig => sig.type === 'autographic')
    
    if (hasSubstrateSignature && hasAutographicSignature) {
      toast.success('Bitácora firmada exitosamente con ambas firmas (Substrate + Autográfica)')
    } else if (hasSubstrateSignature) {
      toast.success('Bitácora firmada con firma Substrate')
    } else if (hasAutographicSignature) {
      toast.success('Bitácora firmada con firma autográfica')
    } else {
      toast.warning('Bitácora guardada pero sin firmas')
    }
    
    // Descargar el PDF firmado automáticamente
    if (updatedDocument.pdf) {
      const filename = `${log?.title || 'bitacora'}_firmado_${new Date().toISOString().split('T')[0]}.pdf`
      downloadPDF(updatedDocument.pdf, filename)
    }
  }

  const handleStartTracking = async () => {
    if (!log) return

    if (!hasPermission) {
      toast.error('Se requiere permiso de geolocalización')
      return
    }

    try {
      await startTracking()
      const updatedLog: MountainLog = {
        ...log,
        isTrackingActive: true,
        startLocation: currentLocation || undefined,
        updatedAt: Date.now()
      }
      await saveMountainLog(updatedLog)
      setLog(updatedLog)
      toast.success('Tracking iniciado')
    } catch (error) {
      console.error('Error al iniciar tracking:', error)
      toast.error('Error al iniciar el tracking')
    }
  }

  const handleStopTracking = async () => {
    if (!log) return

    try {
      stopTracking()
      const updatedLog: MountainLog = {
        ...log,
        isTrackingActive: false,
        endLocation: currentLocation || undefined,
        gpsPoints: [...gpsPoints],
        updatedAt: Date.now()
      }

      // Calcular estadísticas después de detener el tracking
      const { updateMountainLogStatistics } = await import('@/utils/mountainLogStatistics')
      const logWithStats = updateMountainLogStatistics(updatedLog)

      await saveMountainLog(logWithStats)
      setLog(logWithStats)
      toast.success('Tracking detenido y estadísticas actualizadas')
    } catch (error) {
      console.error('Error al detener tracking:', error)
      toast.error('Error al detener el tracking')
    }
  }

  const handleAddMilestone = async () => {
    if (!log) return

    if (!newMilestoneTitle.trim()) {
      toast.error('El título del milestone es requerido')
      return
    }

    try {
      // Intentar obtener ubicación GPS actual si no está disponible
      let gpsPoint = currentLocation
      if (!gpsPoint) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            })
          })
          gpsPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude ?? undefined,
            accuracy: position.coords.accuracy ?? undefined,
            timestamp: position.timestamp || Date.now()
          }
          
          // Validar el punto GPS
          const validation = validateGPSPoint(gpsPoint, currentLocation || undefined)
          if (!validation.isValid || validation.confidence < 70) {
            toast.warning('Ubicación GPS con baja confianza', {
              description: validation.warnings.join('; ') || 'Posible GPS falso detectado'
            })
            // Marcar como sospechoso pero aún así guardarlo
            ;(gpsPoint as any).suspicious = true
            ;(gpsPoint as any).confidence = validation.confidence
          } else {
            toast.success('Ubicación GPS capturada')
          }
        } catch (gpsError) {
          console.warn('No se pudo obtener ubicación GPS:', gpsError)
          toast.info('Milestone creado sin ubicación GPS')
        }
      }

      const timestamp = Date.now()
      const milestone: MountainLogMilestone = {
        id: uuidv4(),
        timestamp,
        title: newMilestoneTitle.trim(),
        description: newMilestoneDescription.trim() || undefined,
        type: newMilestoneType,
        gpsPoint: gpsPoint || undefined,
        images: [],
        order: log.milestones.length
      }

      const updatedLog: MountainLog = {
        ...log,
        milestones: [...log.milestones, milestone].sort((a, b) => a.timestamp - b.timestamp),
        updatedAt: Date.now()
      }

      // Reordenar milestones
      updatedLog.milestones = updatedLog.milestones.map((m, index) => ({
        ...m,
        order: index
      }))

      await saveMountainLog(updatedLog)
      setLog(updatedLog)
      
      // Limpiar formulario
      setNewMilestoneTitle('')
      setNewMilestoneDescription('')
      setNewMilestoneType('checkpoint')
      setShowAddMilestone(false)
      
      toast.success('Milestone agregado')
    } catch (error) {
      console.error('Error al agregar milestone:', error)
      toast.error('Error al agregar milestone')
    }
  }

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!log) return

    if (!confirm('¿Estás seguro de que deseas eliminar este milestone?')) {
      return
    }

    try {
      const updatedLog: MountainLog = {
        ...log,
        milestones: log.milestones
          .filter(m => m.id !== milestoneId)
          .map((m, index) => ({ ...m, order: index })),
        updatedAt: Date.now()
      }

      await saveMountainLog(updatedLog)
      setLog(updatedLog)
      toast.success('Milestone eliminado')
    } catch (error) {
      console.error('Error al eliminar milestone:', error)
      toast.error('Error al eliminar milestone')
    }
  }

  const handleAddImageToMilestone = async (milestoneId: string) => {
    if (!log) return
    setCurrentMilestoneForImage(milestoneId)
    
    // Guardar milestoneId en ref para iOS (puede perder el atributo)
    milestoneIdForCapture.current = milestoneId
    console.log('[handleAddImageToMilestone] Milestone ID guardado:', milestoneId)
    
    // Verificar si estamos en un dispositivo móvil REAL (no solo por tamaño de pantalla)
    // El atributo capture solo funciona en dispositivos móviles reales con HTTPS
    const isRealMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isHTTPS = window.location.protocol === 'https:'
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    
    // En localhost, SIEMPRE mostrar opciones (capture no funciona bien en localhost)
    // En producción HTTPS con móvil real, intentar usar capture directamente
    if (isLocalhost) {
      // En localhost, siempre mostrar opciones (cámara web o archivo)
      console.log('[handleAddImageToMilestone] Localhost detectado - mostrando opciones (cámara web o archivo)...')
      setShowCameraDialog(true)
    } else if (isRealMobile && isHTTPS) {
      // En móvil real con HTTPS, intentar usar input file con capture
      cameraInputRef.current?.setAttribute('data-milestone-id', milestoneId)
      console.log('[handleAddImageToMilestone] Móvil real con HTTPS - abriendo cámara...')
      cameraInputRef.current?.click()
    } else {
      // En desktop o cuando capture no funciona, mostrar opción de webcam o archivo
      console.log('[handleAddImageToMilestone] Mostrando opciones (cámara web o archivo)...')
      setShowCameraDialog(true)
    }
  }

  const handleCameraCapture = async (photoBase64: string) => {
    if (!log || !currentMilestoneForImage) return
    setShowCameraDialog(false)
    
    // Procesar la imagen capturada de la webcam
    await processImageFromBase64(photoBase64, currentMilestoneForImage)
    setCurrentMilestoneForImage(null)
  }

  const handleFileSelect = () => {
    if (!currentMilestoneForImage) return
    cameraInputRef.current?.setAttribute('data-milestone-id', currentMilestoneForImage)
    cameraInputRef.current?.click()
    setShowCameraDialog(false)
  }

  const processImageFromBase64 = async (dataUrl: string, milestoneId: string) => {
    if (!log) return

    try {
      // Convertir base64 a blob
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' })

      // Obtener GPS si está disponible
      let gpsMetadata: GPSMetadata | undefined
      if (currentLocation) {
        gpsMetadata = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          altitude: currentLocation.altitude,
          accuracy: currentLocation.accuracy,
          timestamp: Date.now()
        }
      }

      // Verificar que Image esté disponible
      if (typeof Image === 'undefined') {
        console.error('[processImageFromBase64] Image constructor no está disponible')
        toast.error('Error: No se puede procesar la imagen')
        return
      }

      // Verificar que document esté disponible
      if (typeof document === 'undefined' || document === null) {
        console.error('[processImageFromBase64] document no está disponible')
        toast.error('Error: No se puede procesar la imagen en este momento')
        return
      }

      // Crear imagen
      const img = new Image()
      
      img.onerror = (error) => {
        console.error('[processImageFromBase64] Error al cargar imagen:', error)
        toast.error('Error al procesar la imagen')
      }

      img.onload = async () => {
        try {
          // Verificar que document esté disponible (puede cambiar durante async)
          // Usar window.document como fallback
          const doc = typeof document !== 'undefined' ? document : (typeof window !== 'undefined' && window.document ? window.document : null)
          
          if (!doc) {
            console.error('[processImageFromBase64] document no está disponible en img.onload')
            console.error('[processImageFromBase64] typeof document:', typeof document)
            console.error('[processImageFromBase64] typeof window:', typeof window)
            toast.error('Error: No se puede procesar la imagen en este momento')
            return
          }

          // Verificar que el componente aún esté montado
          if (!log || !milestoneId) {
            console.error('[processImageFromBase64] Log o milestoneId no disponible en img.onload')
            toast.error('Error: La bitácora ya no está disponible')
            return
          }

          // Verificar que createElement esté disponible
          if (typeof doc.createElement !== 'function') {
            console.error('[processImageFromBase64] document.createElement no está disponible')
            toast.error('Error: No se puede procesar la imagen')
            return
          }

          // Crear canvas con try-catch adicional para capturar errores
          let canvas: HTMLCanvasElement
          try {
            canvas = doc.createElement('canvas')
            if (!canvas) {
              throw new Error('createElement retornó null')
            }
          } catch (error) {
            console.error('[processImageFromBase64] Error al crear canvas:', error)
            toast.error('Error: No se puede procesar la imagen. Intenta recargar la página.')
            return
          }
          const maxSize = 200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            console.error('[processImageFromBase64] No se pudo obtener contexto del canvas')
            toast.error('Error al procesar la imagen')
            return
          }

          ctx.drawImage(img, 0, 0, width, height)
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7)

          // Verificar una vez más antes de guardar
          if (!log || !milestoneId) {
            console.error('[processImageFromBase64] Log o milestoneId perdido antes de guardar')
            toast.error('Error: La bitácora ya no está disponible')
            return
          }

          const image: MountainLogImage = {
            id: uuidv4(),
            data: dataUrl,
            thumbnail,
            metadata: {
              filename: file.name,
              mimeType: file.type,
              size: file.size,
              width: img.width,
              height: img.height,
              capturedAt: Date.now(),
              gpsMetadata
            }
          }

          const updatedLog: MountainLog = {
            ...log,
            milestones: log.milestones.map(m =>
              m.id === milestoneId
                ? { ...m, images: [...m.images, image] }
                : m
            ),
            updatedAt: Date.now()
          }

          console.log('[processImageFromBase64] Guardando bitácora...')
          await saveMountainLog(updatedLog)
          console.log('[processImageFromBase64] Bitácora guardada exitosamente')
          
          setLog(prevLog => {
            if (!prevLog) {
              console.warn('[processImageFromBase64] Componente desmontado, no se actualiza estado')
              return prevLog
            }
            return updatedLog
          })
          
          toast.success('Imagen agregada exitosamente')
        } catch (error) {
          console.error('[processImageFromBase64] Error en img.onload:', error)
          toast.error('Error al procesar la imagen: ' + (error instanceof Error ? error.message : 'Error desconocido'))
        }
      }

      // Asignar src después de configurar handlers
      img.src = dataUrl
    } catch (error) {
      console.error('Error al procesar imagen:', error)
      toast.error('Error al procesar la imagen')
    }
  }

  const handleDeleteImageFromMilestone = async (milestoneId: string, imageId: string) => {
    if (!log) return

    try {
      const updatedLog: MountainLog = {
        ...log,
        milestones: log.milestones.map(m => 
          m.id === milestoneId 
            ? { ...m, images: m.images.filter(img => img.id !== imageId) }
            : m
        ),
        updatedAt: Date.now()
      }

      await saveMountainLog(updatedLog)
      setLog(updatedLog)
      toast.success('Imagen eliminada')
    } catch (error) {
      console.error('Error al eliminar imagen:', error)
      toast.error('Error al eliminar la imagen')
    }
  }

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!log) {
      console.error('[handleImageFile] No hay log disponible')
      toast.error('Error: No hay bitácora disponible')
      return
    }

    const files = event.target.files
    if (!files || files.length === 0) {
      console.warn('[handleImageFile] No se seleccionaron archivos')
      return
    }

    const file = files[0]
    console.log('[handleImageFile] Archivo seleccionado:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    if (!file.type.startsWith('image/')) {
      toast.error('El archivo debe ser una imagen')
      return
    }

    // Obtener milestoneId ANTES de procesar (iOS puede limpiar el input)
    // Intentar desde el atributo primero, luego desde el ref
    let milestoneId = cameraInputRef.current?.getAttribute('data-milestone-id') || milestoneIdForCapture.current
    console.log('[handleImageFile] Milestone ID (atributo):', cameraInputRef.current?.getAttribute('data-milestone-id'))
    console.log('[handleImageFile] Milestone ID (ref):', milestoneIdForCapture.current)
    console.log('[handleImageFile] Milestone ID (final):', milestoneId)

    if (!milestoneId) {
      console.error('[handleImageFile] No se encontró milestoneId')
      toast.error('Error: No se pudo identificar el milestone. Intenta de nuevo.')
      // Limpiar input
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      return
    }

    // Verificar que el milestone existe
    const milestone = log.milestones.find(m => m.id === milestoneId)
    if (!milestone) {
      console.error('[handleImageFile] Milestone no encontrado:', milestoneId)
      toast.error('Error: Milestone no encontrado')
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
      }
      return
    }

    try {
      const reader = new FileReader()
      
      reader.onerror = (error) => {
        console.error('[handleImageFile] Error en FileReader:', error)
        toast.error('Error al leer la imagen')
        if (cameraInputRef.current) {
          cameraInputRef.current.value = ''
        }
      }

          reader.onload = async (e) => {
        try {
          // Verificar que el componente aún esté montado
          if (!log || !milestoneId) {
            console.error('[handleImageFile] Log o milestoneId no disponible en reader.onload')
            toast.error('Error: La bitácora ya no está disponible')
            return
          }

          const dataUrl = e.target?.result as string
          if (!dataUrl) {
            console.error('[handleImageFile] No se pudo obtener dataUrl')
            toast.error('Error al procesar la imagen')
            return
          }

          console.log('[handleImageFile] Imagen leída, tamaño dataUrl:', dataUrl.length)

          let gpsMetadata: GPSMetadata | undefined
          if (currentLocation) {
            gpsMetadata = {
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              altitude: currentLocation.altitude,
              accuracy: currentLocation.accuracy,
              timestamp: Date.now()
            }
            console.log('[handleImageFile] GPS metadata agregado:', gpsMetadata)
          }

          // Verificar que Image esté disponible
          if (typeof Image === 'undefined') {
            console.error('[handleImageFile] Image constructor no está disponible')
            toast.error('Error: No se puede procesar la imagen')
            return
          }

          const img = new Image()
          
          // Configurar handlers ANTES de asignar src
          img.onerror = (error) => {
            console.error('[handleImageFile] Error al cargar imagen:', error)
            toast.error('Error al procesar la imagen')
            milestoneIdForCapture.current = null
          }

          // Timeout de seguridad para iOS
          let timeoutId: NodeJS.Timeout | null = null
          
          img.onload = async () => {
            // Limpiar timeout si existe
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            try {
              console.log('[handleImageFile] Imagen cargada, dimensiones:', img.width, 'x', img.height)

              // Verificar que document esté disponible (iOS puede tener problemas)
              // Usar window.document como fallback
              const doc = typeof document !== 'undefined' ? document : (typeof window !== 'undefined' && window.document ? window.document : null)
              
              if (!doc) {
                console.error('[handleImageFile] document no está disponible en img.onload')
                console.error('[handleImageFile] typeof document:', typeof document)
                console.error('[handleImageFile] typeof window:', typeof window)
                toast.error('Error: No se puede procesar la imagen en este momento')
                return
              }

              // Verificar que el componente aún esté montado y el log exista
              if (!log || !milestoneId) {
                console.error('[handleImageFile] Log o milestoneId no disponible en img.onload')
                toast.error('Error: La bitácora ya no está disponible')
                return
              }

              // Verificar que createElement esté disponible
              if (typeof doc.createElement !== 'function') {
                console.error('[handleImageFile] document.createElement no está disponible')
                toast.error('Error: No se puede procesar la imagen')
                return
              }

              // Crear canvas con try-catch adicional para capturar errores
              let canvas: HTMLCanvasElement
              try {
                canvas = doc.createElement('canvas')
                if (!canvas) {
                  throw new Error('createElement retornó null')
                }
              } catch (error) {
                console.error('[handleImageFile] Error al crear canvas:', error)
                toast.error('Error: No se puede procesar la imagen. Intenta recargar la página.')
                return
              }
              const maxSize = 200
              let width = img.width
              let height = img.height

              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width
                  width = maxSize
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height
                  height = maxSize
                }
              }

              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              if (!ctx) {
                throw new Error('No se pudo obtener contexto del canvas')
              }

              ctx.drawImage(img, 0, 0, width, height)
              const thumbnail = canvas.toDataURL('image/jpeg', 0.7)
              console.log('[handleImageFile] Thumbnail generado')

              const image: MountainLogImage = {
                id: uuidv4(),
                data: dataUrl,
                thumbnail,
                metadata: {
                  filename: file.name || `foto-${Date.now()}.jpg`,
                  mimeType: file.type || 'image/jpeg',
                  size: file.size,
                  width: img.width,
                  height: img.height,
                  capturedAt: Date.now(),
                  gpsMetadata
                }
              }

              console.log('[handleImageFile] Creando imagen, milestoneId:', milestoneId)
              console.log('[handleImageFile] Milestones actuales:', log.milestones.length)

              const updatedLog: MountainLog = {
                ...log,
                milestones: log.milestones.map(m => {
                  if (m.id === milestoneId) {
                    console.log('[handleImageFile] Agregando imagen al milestone:', m.id, 'Imágenes actuales:', m.images.length)
                    return { ...m, images: [...m.images, image] }
                  }
                  return m
                }),
                updatedAt: Date.now()
              }

              // Verificar una vez más antes de guardar
              if (!log || !milestoneId) {
                console.error('[handleImageFile] Log o milestoneId perdido antes de guardar')
                toast.error('Error: La bitácora ya no está disponible')
                return
              }

              console.log('[handleImageFile] Guardando bitácora actualizada...')
              try {
                await saveMountainLog(updatedLog)
                console.log('[handleImageFile] Bitácora guardada exitosamente')
                
                // Verificar que el componente aún esté montado antes de actualizar estado
                setLog(prevLog => {
                  if (!prevLog) {
                    console.warn('[handleImageFile] Componente desmontado, no se actualiza estado')
                    return prevLog
                  }
                  return updatedLog
                })
                
                toast.success('Imagen agregada exitosamente')
                
                // Limpiar milestoneId después de éxito
                milestoneIdForCapture.current = null
                
                // Verificar que se guardó correctamente
                const savedMilestone = updatedLog.milestones.find(m => m.id === milestoneId)
                if (savedMilestone) {
                  console.log('[handleImageFile] ✅ Imagen agregada. Total de imágenes en milestone:', savedMilestone.images.length)
                } else {
                  console.error('[handleImageFile] ❌ Milestone no encontrado después de guardar')
                }
              } catch (saveError) {
                console.error('[handleImageFile] Error al guardar:', saveError)
                toast.error('Error al guardar la imagen: ' + (saveError instanceof Error ? saveError.message : 'Error desconocido'))
                throw saveError
              }
            } catch (error) {
              console.error('[handleImageFile] Error en img.onload:', error)
              toast.error('Error al procesar la imagen: ' + (error instanceof Error ? error.message : 'Error desconocido'))
            }
          }

          // Asignar src después de configurar handlers
          img.src = dataUrl
          
          // Timeout de seguridad para iOS (10 segundos)
          timeoutId = setTimeout(() => {
            if (!img.complete) {
              console.error('[handleImageFile] Timeout al cargar imagen después de 10s')
              toast.error('La imagen tardó demasiado en cargar. Intenta con otra foto.')
              img.onerror = null
              img.onload = null
              milestoneIdForCapture.current = null
            }
          }, 10000)
        } catch (error) {
          console.error('[handleImageFile] Error en reader.onload:', error)
          toast.error('Error al procesar la imagen: ' + (error instanceof Error ? error.message : 'Error desconocido'))
          milestoneIdForCapture.current = null
        }
      }

      console.log('[handleImageFile] Iniciando lectura del archivo...')
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('[handleImageFile] Error general:', error)
      toast.error('Error al procesar la imagen: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      // Limpiar input después de procesar
      if (cameraInputRef.current) {
        cameraInputRef.current.value = ''
        // NO remover el data-milestone-id aquí todavía, se limpiará después de éxito
      }
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getMilestoneIcon = (type: MountainLogMilestone['type']) => {
    switch (type) {
      case 'checkpoint':
        return <CheckCircle className="h-5 w-5" />
      case 'camp':
        return <Tent className="h-5 w-5" />
      case 'summit':
        return <MountainIcon className="h-5 w-5" />
      case 'photo':
        return <ImageIcon className="h-5 w-5" />
      case 'note':
        return <FileText className="h-5 w-5" />
      default:
        return <MapPin className="h-5 w-5" />
    }
  }

  const getMilestoneColor = (type: MountainLogMilestone['type']) => {
    switch (type) {
      case 'checkpoint':
        return 'bg-blue-500'
      case 'camp':
        return 'bg-green-500'
      case 'summit':
        return 'bg-yellow-500'
      case 'photo':
        return 'bg-purple-500'
      case 'note':
        return 'bg-gray-500'
      default:
        return 'bg-gray-400'
    }
  }

  const isReadOnly = log?.status === 'completed'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Cargando...</div>
      </div>
    )
  }

  if (!log) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Bitácora no encontrada</div>
      </div>
    )
  }

  // Mostrar formulario de Planeación si es nueva bitácora
  if (showPlaneacion && !logId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/mountain-logs')}
              className="h-9 w-9 p-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold">Planeación de Expedición</h1>
            </div>
            <div className="w-9" />
          </div>
        </div>
        <PlaneacionForm
          log={log}
          onUpdate={async (updatedLog) => {
            setLog(updatedLog)
            try {
              await saveMountainLog(updatedLog)
            } catch (error) {
              console.error('Error al guardar:', error)
            }
          }}
          onComplete={() => {
            setShowPlaneacion(false)
            setShowAvisoSalida(true)
          }}
          onSkip={() => {
            // Si omite planeación, asegurar que tenga nombre mínimo
            if (!log.title || log.title === 'Nueva Bitácora') {
              const updatedLog = {
                ...log,
                title: `Bitácora ${new Date().toLocaleDateString('es-ES')}`
              }
              setLog(updatedLog)
              saveMountainLog(updatedLog)
            }
            setShowPlaneacion(false)
            setShowAvisoSalida(true)
          }}
        />
      </div>
    )
  }

  // Mostrar formulario de Aviso de Salida si es nueva bitácora
  if (showAvisoSalida && !logId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/mountain-logs')}
              className="h-9 w-9 p-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 text-center">
              <h1 className="text-lg font-semibold">Aviso de Salida - Socorro Andino</h1>
            </div>
            <div className="w-9" />
          </div>
        </div>
        <AvisoSalidaForm
          log={log}
          onUpdate={async (updatedLog) => {
            setLog(updatedLog)
            // Guardar automáticamente para que los datos persistan
            try {
              await saveMountainLog(updatedLog)
            } catch (error) {
              console.error('Error al guardar:', error)
            }
          }}
          onComplete={async () => {
            // Verificar que no tenga ya un aviso de salida (cada bitácora solo puede tener uno)
            if (log.avisoSalida && logId) {
              toast.warning('Esta bitácora ya tiene un aviso de salida registrado')
              navigate(`/mountain-logs/${log.logId}`)
              return
            }
            
            setShowAvisoSalida(false)
            // Actualizar título con lugar de destino si existe
            if (log.avisoSalida?.actividad.lugarDestino) {
              const updatedLog = {
                ...log,
                title: log.avisoSalida.actividad.lugarDestino || log.title || 'Nueva Bitácora',
                location: log.avisoSalida.actividad.regionDestino || '',
                mountainName: log.avisoSalida.actividad.lugarDestino || ''
              }
              setLog(updatedLog)
              await saveMountainLog(updatedLog)
            }
            navigate(`/mountain-logs/${log.logId}`)
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header fijo */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/mountain-logs')}
            className="h-9 w-9 p-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold truncate px-2">{log.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {log.avisoSalida && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAvisoSalidaView(true)}
                className="h-9"
                title="Ver Aviso de Salida"
              >
                <Info className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Aviso</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exportingPDF}
              className="h-9"
              title="Exportar a PDF"
            >
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            {document && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignDialog(true)}
                className="h-9"
                title="Firmar PDF"
              >
                <PenTool className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Firmar</span>
              </Button>
            )}
            {!isReadOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-9"
                title="Guardar cambios (no finaliza la bitácora)"
              >
                <Save className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal - Timeline de milestones */}
      <div className="px-4 py-6 space-y-6">
        {/* Mapa de la ruta - Solo mostrar si la bitácora está finalizada */}
        {isReadOnly && (
          <RouteMap log={log} />
        )}

        {/* Estadísticas de la bitácora */}
        {log.statistics && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Estadísticas de la Ruta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {log.statistics.totalDistance !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Distancia Total</p>
                    <p className="text-lg font-semibold">{(log.statistics.totalDistance / 1000).toFixed(2)} km</p>
                  </div>
                )}
                {log.statistics.totalDuration !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Duración Total</p>
                    <p className="text-lg font-semibold">
                      {Math.floor(log.statistics.totalDuration / 3600)}h {Math.floor((log.statistics.totalDuration % 3600) / 60)}m
                    </p>
                  </div>
                )}
                {log.statistics.maxElevation !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Elevación Máxima</p>
                    <p className="text-lg font-semibold">{Math.round(log.statistics.maxElevation)} m</p>
                  </div>
                )}
                {log.statistics.minElevation !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Elevación Mínima</p>
                    <p className="text-lg font-semibold">{Math.round(log.statistics.minElevation)} m</p>
                  </div>
                )}
                {log.statistics.totalElevationGain !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Elevación Ganada</p>
                    <p className="text-lg font-semibold">{Math.round(log.statistics.totalElevationGain)} m</p>
                  </div>
                )}
                {log.statistics.totalElevationLoss !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Elevación Perdida</p>
                    <p className="text-lg font-semibold">{Math.round(log.statistics.totalElevationLoss)} m</p>
                  </div>
                )}
                {log.statistics.maxSpeed !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidad Máxima</p>
                    <p className="text-lg font-semibold">{(log.statistics.maxSpeed * 3.6).toFixed(1)} km/h</p>
                  </div>
                )}
                {log.statistics.averageSpeed !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Velocidad Promedio</p>
                    <p className="text-lg font-semibold">{(log.statistics.averageSpeed * 3.6).toFixed(1)} km/h</p>
                  </div>
                )}
                {log.startDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tiempo de Inicio</p>
                    <p className="text-lg font-semibold">
                      {new Date(log.startDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                {log.endDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Tiempo Final</p>
                    <p className="text-lg font-semibold">
                      {new Date(log.endDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                {log.statistics.numberOfPhotos !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fotos</p>
                    <p className="text-lg font-semibold">{log.statistics.numberOfPhotos}</p>
                  </div>
                )}
                {log.statistics.numberOfWaypoints !== undefined && (
                  <div>
                    <p className="text-xs text-muted-foreground">Milestones</p>
                    <p className="text-lg font-semibold">{log.statistics.numberOfWaypoints}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Información de tracking */}
        {isTracking && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Tracking activo</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStopTracking}
                >
                  <Square className="h-4 w-4 mr-1" />
                  Detener
                </Button>
              </div>
              {currentLocation && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  {currentLocation.altitude && ` • ${Math.round(currentLocation.altitude)}m`}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline de milestones */}
        <div className="space-y-4">
          {log.milestones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MountainIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No hay milestones aún. Agrega tu primer milestone para comenzar.
                </p>
                {!isReadOnly && (
                  <Button onClick={() => setShowAddMilestone(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Primer Milestone
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Línea vertical de timeline */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              
              {log.milestones.map((milestone, index) => (
                <div key={milestone.id} className="relative flex gap-4 pb-6">
                  {/* Punto del timeline */}
                  <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${getMilestoneColor(milestone.type)} flex items-center justify-center text-white shadow-lg`}>
                    {getMilestoneIcon(milestone.type)}
                  </div>

                  {/* Contenido del milestone */}
                  <div className="flex-1 min-w-0 pt-1">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base mb-1">{milestone.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(milestone.timestamp)}</span>
                              {milestone.gpsPoint && (
                                <>
                                  <span>•</span>
                                  <MapPin className="h-3 w-3 text-primary" />
                                  <span className="font-mono text-xs">
                                    {milestone.gpsPoint.latitude.toFixed(4)}, {milestone.gpsPoint.longitude.toFixed(4)}
                                    {milestone.gpsPoint.altitude && ` • ${Math.round(milestone.gpsPoint.altitude)}m`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {!isReadOnly && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDeleteMilestone(milestone.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Tipo de milestone */}
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs">
                            {milestone.type === 'checkpoint' ? 'Punto de Control' :
                             milestone.type === 'camp' ? 'Campamento' :
                             milestone.type === 'summit' ? 'Cumbre' :
                             milestone.type === 'photo' ? 'Foto' :
                             milestone.type === 'note' ? 'Nota' : 'Personalizado'}
                          </Badge>
                        </div>

                        {milestone.description && (
                          <div className="mb-3">
                            <div className="p-3 bg-muted/30 rounded-lg">
                              <p className={`text-sm text-foreground ${milestone.description.length > 150 ? 'line-clamp-3' : ''}`}>
                                {milestone.description}
                              </p>
                            </div>
                            {milestone.description.length > 150 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 text-xs h-auto py-1 px-2"
                                onClick={() => setSelectedMilestoneDescription({
                                  title: milestone.title,
                                  description: milestone.description || ''
                                })}
                              >
                                Ver descripción completa...
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Información GPS simplificada del milestone */}
                        {milestone.gpsPoint && (
                          <div className="mb-3">
                            <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                              (milestone.gpsPoint as any).suspicious 
                                ? 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-700' 
                                : 'bg-muted/50 border border-border'
                            }`}>
                              <MapPin className={`h-3.5 w-3.5 flex-shrink-0 ${
                                (milestone.gpsPoint as any).suspicious 
                                  ? 'text-yellow-600 dark:text-yellow-400' 
                                  : 'text-primary'
                              }`} />
                              <div className="flex-1 flex items-center gap-3 flex-wrap">
                                {milestone.gpsPoint.altitude && (
                                  <span className="font-medium">{Math.round(milestone.gpsPoint.altitude)} m</span>
                                )}
                                {milestone.gpsPoint.accuracy && (
                                  <span className="text-muted-foreground">
                                    Precisión: ±{Math.round(milestone.gpsPoint.accuracy)} m
                                  </span>
                                )}
                                {(milestone.gpsPoint as any).suspicious && (
                                  <Badge variant="destructive" className="text-xs px-1.5 py-0">
                                    ⚠️ Sospechoso
                                  </Badge>
                                )}
                                {(milestone.gpsPoint as any).confidence !== undefined && (milestone.gpsPoint as any).confidence < 70 && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                                    {(milestone.gpsPoint as any).confidence}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {(milestone.gpsPoint as any).suspicionReason && (
                              <div className="mt-1 p-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-900 dark:text-yellow-100">
                                ⚠️ {(milestone.gpsPoint as any).suspicionReason}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Metadata adicional del milestone */}
                        {milestone.metadata && Object.keys(milestone.metadata).length > 0 && (
                          <Card className="mb-3 bg-muted/30">
                            <CardContent className="p-3">
                              <div className="text-xs space-y-1">
                                <div className="font-semibold text-sm mb-2">Información Adicional</div>
                                {milestone.metadata.elevation && (
                                  <div>
                                    <span className="text-muted-foreground">Elevación: </span>
                                    <span className="font-semibold">{milestone.metadata.elevation} m</span>
                                  </div>
                                )}
                                {milestone.metadata.weather && (
                                  <div>
                                    <span className="text-muted-foreground">Clima: </span>
                                    <span>{milestone.metadata.weather}</span>
                                  </div>
                                )}
                                {milestone.metadata.temperature && (
                                  <div>
                                    <span className="text-muted-foreground">Temperatura: </span>
                                    <span>{milestone.metadata.temperature}°C</span>
                                  </div>
                                )}
                                {milestone.metadata.duration && (
                                  <div>
                                    <span className="text-muted-foreground">Duración: </span>
                                    <span>{Math.round(milestone.metadata.duration / 60)} min</span>
                                  </div>
                                )}
                                {milestone.metadata.distance && (
                                  <div>
                                    <span className="text-muted-foreground">Distancia: </span>
                                    <span>{(milestone.metadata.distance / 1000).toFixed(2)} km</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Imágenes del milestone */}
                        {milestone.images.length > 0 && (
                          <div className="mb-3">
                            <ImageGallery
                              images={milestone.images}
                              onDelete={!isReadOnly ? (imageId) => handleDeleteImageFromMilestone(milestone.id, imageId) : undefined}
                              canDelete={!isReadOnly}
                            />
                          </div>
                        )}

                        {/* Botón para agregar imagen */}
                        {!isReadOnly && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddImageToMilestone(milestone.id)}
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Agregar Foto
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón flotante para agregar milestone */}
        {!isReadOnly && (
          <div className="fixed bottom-20 right-4 z-20">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => setShowAddMilestone(true)}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        )}

        {/* Botones de acción fijos en la parte inferior */}
        {!isReadOnly && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 space-y-2 z-10 safe-area-bottom">
            {!isTracking ? (
              <Button
                className="w-full"
                onClick={handleStartTracking}
                disabled={!hasPermission}
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar Tracking GPS
              </Button>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleStopTracking}
              >
                <Square className="h-4 w-4 mr-2" />
                Detener Tracking
              </Button>
            )}
            {log.status !== 'completed' && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleFinalize}
                disabled={saving}
              >
                Finalizar Bitácora
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Dialog para agregar milestone */}
      <Dialog open={showAddMilestone} onOpenChange={setShowAddMilestone}>
        <DialogContent className="sm:max-w-[425px] mx-4">
          <DialogHeader>
            <DialogTitle>Nuevo Milestone</DialogTitle>
            <DialogDescription>
              Agrega un nuevo hito a tu bitácora
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-title">Título *</Label>
              <Input
                id="milestone-title"
                value={newMilestoneTitle}
                onChange={(e) => setNewMilestoneTitle(e.target.value)}
                placeholder="Ej: Base Camp"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-type">Tipo</Label>
              <Select
                value={newMilestoneType}
                onValueChange={(value) => setNewMilestoneType(value as MountainLogMilestone['type'])}
              >
                <SelectTrigger id="milestone-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkpoint">Checkpoint</SelectItem>
                  <SelectItem value="camp">Campamento</SelectItem>
                  <SelectItem value="summit">Cima</SelectItem>
                  <SelectItem value="photo">Foto</SelectItem>
                  <SelectItem value="note">Nota</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="milestone-description">Descripción</Label>
              <Textarea
                id="milestone-description"
                value={newMilestoneDescription}
                onChange={(e) => setNewMilestoneDescription(e.target.value)}
                placeholder="Descripción opcional..."
                rows={3}
              />
            </div>

            {currentLocation && (
              <div className="p-3 bg-muted rounded-lg text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3 w-3" />
                  <span className="font-medium">Ubicación GPS disponible</span>
                </div>
                <div className="text-muted-foreground">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                  {currentLocation.altitude && ` • ${Math.round(currentLocation.altitude)}m`}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddMilestone(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleAddMilestone}
              disabled={!newMilestoneTitle.trim()}
            >
              Agregar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Input oculto para captura de imágenes */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture={isMobile ? "environment" : undefined}
        onChange={handleImageFile}
        className="hidden"
        // En móviles: capture="environment" abre la cámara trasera automáticamente
        // En desktop: permite seleccionar archivo desde el sistema o usar webcam si el navegador lo soporta
      />

      {/* Dialog para ver Aviso de Salida */}
      <Dialog open={showAvisoSalidaView} onOpenChange={setShowAvisoSalidaView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aviso de Salida - Socorro Andino</DialogTitle>
            <DialogDescription>
              Información completa del aviso de salida registrado
            </DialogDescription>
          </DialogHeader>
          {log.avisoSalida && <AvisoSalidaView avisoSalida={log.avisoSalida} />}
        </DialogContent>
      </Dialog>

      {/* Dialog para capturar foto desde webcam o archivo */}
      <Dialog open={showCameraDialog} onOpenChange={(open) => {
        if (!open) {
          setShowCameraDialog(false)
          setCurrentMilestoneForImage(null)
          milestoneIdForCapture.current = null
        }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Imagen al Milestone</DialogTitle>
            <DialogDescription>
              Elige cómo deseas agregar la imagen: desde un archivo o capturando con la cámara web
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={handleFileSelect}
                className="flex flex-col items-center gap-2 h-auto py-6"
              >
                <ImageIcon className="h-8 w-8" />
                <span className="font-medium">Desde Archivo</span>
                <span className="text-xs text-muted-foreground">Galería o explorador</span>
              </Button>
              <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-muted/30">
                <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  O usa la cámara web abajo
                </p>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="mb-2 text-sm font-medium">Capturar desde cámara web:</div>
              <PhotoCapture
                onCapture={handleCameraCapture}
                onCancel={() => {
                  setShowCameraDialog(false)
                  setCurrentMilestoneForImage(null)
                  milestoneIdForCapture.current = null
                }}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver descripción completa del milestone */}
      <Dialog open={selectedMilestoneDescription !== null} onOpenChange={(open) => !open && setSelectedMilestoneDescription(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMilestoneDescription?.title}</DialogTitle>
            <DialogDescription>
              Descripción completa del milestone
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {selectedMilestoneDescription?.description}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para firmar documento */}
      {document && (
        <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Firmar Bitácora</DialogTitle>
              <DialogDescription>
                Firma el PDF de la bitácora para validar su autenticidad
              </DialogDescription>
            </DialogHeader>
            <SignatureSelector
              document={document}
              onSigned={handleSignDocument}
              onCancel={() => setShowSignDialog(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
