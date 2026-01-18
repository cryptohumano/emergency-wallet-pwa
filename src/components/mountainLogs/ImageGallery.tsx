import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Info,
  MapPin,
  Calendar,
  Camera,
  Image as ImageIcon
} from 'lucide-react'
import type { MountainLogImage } from '@/types/mountainLogs'

interface ImageGalleryProps {
  images: MountainLogImage[]
  onDelete?: (imageId: string) => void
  canDelete?: boolean
}

export function ImageGallery({ images, onDelete, canDelete = true }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showMetadata, setShowMetadata] = useState(false)

  if (images.length === 0) {
    return null
  }

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const handleDelete = () => {
    if (selectedImage && onDelete) {
      onDelete(selectedImage.id)
      if (selectedIndex !== null) {
        if (selectedIndex >= images.length - 1 && selectedIndex > 0) {
          setSelectedIndex(selectedIndex - 1)
        } else if (images.length === 1) {
          setSelectedIndex(null)
        }
      }
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <>
      {/* Grid de imágenes */}
      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
            onClick={() => setSelectedIndex(index)}
          >
            <img
              src={image.thumbnail || image.data}
              alt={image.metadata.filename}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            {image.metadata.gpsMetadata && (
              <Badge 
                variant="secondary" 
                className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5"
              >
                <MapPin className="h-2.5 w-2.5 mr-1" />
                GPS
              </Badge>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal de imagen grande */}
      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && setSelectedIndex(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 bg-black/95 sm:p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Vista de Imagen</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Imagen principal */}
              <div className="relative w-full h-full flex items-center justify-center p-4 pb-20 sm:pb-4">
                <img
                  src={selectedImage.data}
                  alt={selectedImage.metadata.filename}
                  className="max-w-full max-h-[60vh] sm:max-h-[85vh] object-contain"
                />
              </div>

              {/* Botón cerrar */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 bg-black/50 hover:bg-black/70 text-white z-20"
                onClick={() => setSelectedIndex(null)}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Botón información/metadata */}
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-4 right-16 h-10 w-10 bg-black/50 hover:bg-black/70 text-white z-20 ${showMetadata ? 'bg-primary/80' : ''}`}
                onClick={() => setShowMetadata(!showMetadata)}
                title={showMetadata ? 'Ocultar información' : 'Mostrar información'}
              >
                <Info className="h-5 w-5" />
              </Button>

              {/* Botón eliminar */}
              {canDelete && onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-28 h-10 w-10 bg-red-500/80 hover:bg-red-500 text-white z-20"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}

              {/* Navegación izquierda */}
              {selectedIndex !== null && selectedIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 h-12 w-12 bg-black/50 hover:bg-black/70 text-white z-20"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {/* Navegación derecha */}
              {selectedIndex !== null && selectedIndex < images.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 h-12 w-12 bg-black/50 hover:bg-black/70 text-white z-20"
                  onClick={handleNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              {/* Contador de imágenes - Solo visible cuando metadata está cerrado */}
              {!showMetadata && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm z-20">
                  {selectedIndex !== null ? selectedIndex + 1 : 0} / {images.length}
                </div>
              )}

              {/* Panel de metadata */}
              {showMetadata && (
                <Card className="absolute bottom-0 left-0 right-0 sm:bottom-4 sm:left-4 sm:right-auto sm:max-w-md bg-background/98 backdrop-blur-sm z-20 max-h-[75vh] sm:max-h-[60vh] overflow-hidden flex flex-col rounded-t-xl sm:rounded-lg shadow-2xl border-t-2 sm:border-t border-primary/20">
                  {/* Header sticky siempre visible */}
                  <div className="flex items-center justify-between p-4 pb-3 border-b bg-background/98 backdrop-blur-sm sticky top-0 z-10 flex-shrink-0">
                    <h3 className="font-semibold flex items-center gap-2 text-base">
                      <Camera className="h-4 w-4" />
                      <span className="hidden sm:inline">Información de la Imagen</span>
                      <span className="sm:hidden">Info</span>
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowMetadata(false)}
                      className="h-9 w-9 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                      title="Cerrar información"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* Contenido scrolleable */}
                  <CardContent className="p-4 pt-3 space-y-3 overflow-y-auto flex-1">

                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Nombre</p>
                        <p className="font-medium">{selectedImage.metadata.filename}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground text-xs">Fecha de Captura</p>
                          <p className="font-medium">{formatDate(selectedImage.metadata.capturedAt)}</p>
                        </div>
                      </div>

                      {selectedImage.metadata.width && selectedImage.metadata.height && (
                        <div>
                          <p className="text-muted-foreground text-xs">Dimensiones</p>
                          <p className="font-medium">
                            {selectedImage.metadata.width} × {selectedImage.metadata.height} px
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-muted-foreground text-xs">Tamaño</p>
                        <p className="font-medium">{formatFileSize(selectedImage.metadata.size)}</p>
                      </div>

                      {selectedImage.metadata.gpsMetadata && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <p className="font-semibold text-sm">Ubicación GPS</p>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">Latitud: </span>
                              <span className="font-mono">{selectedImage.metadata.gpsMetadata.latitude.toFixed(6)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Longitud: </span>
                              <span className="font-mono">{selectedImage.metadata.gpsMetadata.longitude.toFixed(6)}</span>
                            </div>
                            {selectedImage.metadata.gpsMetadata.altitude && (
                              <div>
                                <span className="text-muted-foreground">Altitud: </span>
                                <span className="font-mono">{Math.round(selectedImage.metadata.gpsMetadata.altitude)} m</span>
                              </div>
                            )}
                            {selectedImage.metadata.gpsMetadata.accuracy && (
                              <div>
                                <span className="text-muted-foreground">Precisión: </span>
                                <span className="font-mono">±{Math.round(selectedImage.metadata.gpsMetadata.accuracy)} m</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedImage.description && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground text-xs">Descripción</p>
                          <p className="text-sm">{selectedImage.description}</p>
                        </div>
                      )}

                      {selectedImage.metadata.cameraSettings && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground text-xs mb-1">Configuración de Cámara</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {selectedImage.metadata.cameraSettings.iso && (
                              <div>
                                <span className="text-muted-foreground">ISO: </span>
                                <span>{selectedImage.metadata.cameraSettings.iso}</span>
                              </div>
                            )}
                            {selectedImage.metadata.cameraSettings.aperture && (
                              <div>
                                <span className="text-muted-foreground">Apertura: </span>
                                <span>{selectedImage.metadata.cameraSettings.aperture}</span>
                              </div>
                            )}
                            {selectedImage.metadata.cameraSettings.shutterSpeed && (
                              <div>
                                <span className="text-muted-foreground">Velocidad: </span>
                                <span>{selectedImage.metadata.cameraSettings.shutterSpeed}</span>
                              </div>
                            )}
                            {selectedImage.metadata.cameraSettings.focalLength && (
                              <div>
                                <span className="text-muted-foreground">Focal: </span>
                                <span>{selectedImage.metadata.cameraSettings.focalLength}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
