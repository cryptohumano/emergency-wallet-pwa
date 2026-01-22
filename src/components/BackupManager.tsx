import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Upload, AlertTriangle, CheckCircle, Info, FileText, Eye, EyeOff } from 'lucide-react'
import { downloadBackup, readBackupFile, importBackup, type BackupData } from '@/utils/backup'
import { useKeyringContext } from '@/contexts/KeyringContext'
import { useNavigate } from 'react-router-dom'
import { decrypt } from '@/utils/encryption'
import { useI18n } from '@/contexts/I18nContext'

interface BackupManagerProps {
  onImportComplete?: () => void
}

export function BackupManager({ onImportComplete }: BackupManagerProps = {}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { refreshStoredAccounts, refreshWebAuthnCredentials, unlock } = useKeyringContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [exportOptions, setExportOptions] = useState({
    includeImages: false, // Por defecto no incluir imágenes (backup más pequeño)
    includePDFs: false, // Por defecto no incluir PDFs (backup más pequeño)
  })
  const [importOptions, setImportOptions] = useState({
    overwriteAccounts: false,
    overwriteContacts: false,
    overwriteApiConfigs: false,
    overwriteWebAuthn: false,
    overwriteMountainLogs: false,
    overwriteDocuments: false,
  })
  const [importPassword, setImportPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    accountsImported: number
    contactsImported: number
    apiConfigsImported: number
    webauthnImported: number
    transactionsImported: number
    mountainLogsImported: number
    documentsImported: number
    errors: string[]
  } | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('[BackupManager] Iniciando descarga de backup...', exportOptions)
      await downloadBackup(exportOptions)
      console.log('[BackupManager] ✅ Backup descargado exitosamente')
      const sizeInfo = exportOptions.includeImages || exportOptions.includePDFs
        ? t('backup.exportSuccessWithFiles')
        : t('backup.exportSuccessWithoutFiles')
      setSuccess(`${t('backup.exportSuccess')}${sizeInfo}. ${t('backup.exportSuccessDesc')}`)
      
      // Mostrar información adicional en consola para debugging
      console.log('[BackupManager] Si no se descargó el archivo, verifica:')
      console.log('  1. Que tu navegador permita descargas automáticas')
      console.log('  2. Que no haya bloqueadores de pop-ups activos')
      console.log('  3. La consola del navegador para más detalles')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('backup.exportError')
      console.error('[BackupManager] ❌ Error:', err)
      console.error('[BackupManager] Detalles:', {
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      })
      setError(`${t('backup.exportError')}: ${errorMessage}. ${t('backup.exportErrorDesc')}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)
    setImportResult(null)
    setImportPassword('') // Limpiar contraseña anterior
    setPasswordError(null)

    try {
      // Leer y validar el archivo (esto puede tomar tiempo, mostrar loading)
      setIsImporting(true)
      const backup = await readBackupFile(file)
      setIsImporting(false) // Ya leímos el archivo, ahora esperamos confirmación
      
      // Mostrar información del backup
      const backupDate = new Date(backup.createdAt).toLocaleString()
      const accountsCount = backup.accounts?.length || 0
      const contactsCount = backup.contacts?.length || 0
      const apiConfigsCount = backup.apiConfigs?.length || 0
      const webauthnCount = backup.webauthnCredentials?.length || 0

      // Abrir diálogo de confirmación con opciones
      setIsDialogOpen(true)
      
      // Guardar el backup en el estado para importarlo después
      ;(window as any).__pendingBackup = backup
    } catch (err) {
      setError(err instanceof Error ? err.message : t('backup.readError'))
      setIsImporting(false)
    }

    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    // Prevenir múltiples ejecuciones simultáneas
    if (isImporting) {
      console.log('[BackupManager] ⚠️ Importación ya en progreso, ignorando llamada duplicada')
      return
    }

    const backup = (window as any).__pendingBackup as BackupData | undefined
    if (!backup) {
      setError(t('backup.noPendingBackup'))
      return
    }

    // Si hay cuentas en el backup, verificar la contraseña
    if (backup.accounts && backup.accounts.length > 0) {
      if (!importPassword) {
        setPasswordError(t('backup.passwordRequired'))
        return
      }

      // Verificar que la contraseña sea correcta intentando desencriptar la primera cuenta
      try {
        const testAccount = backup.accounts[0]
        await decrypt(testAccount.encryptedData, importPassword)
        setPasswordError(null)
      } catch (err) {
        setPasswordError(t('backup.wrongPassword'))
        return
      }
    }

    setIsImporting(true)
    setError(null)
    setSuccess(null)
    setPasswordError(null)

    try {
      console.log('[BackupManager] Iniciando importación...')
      const result = await importBackup(backup, importOptions)
      console.log('[BackupManager] Importación completada:', result)
      setImportResult(result)

      // Si la contraseña es correcta y hay cuentas, desbloquear el keyring
      // Nota: No desbloquear aquí porque las cuentas ya están en IndexedDB
      // El usuario puede desbloquear después desde la pantalla de unlock
      // Solo refrescar el estado
      console.log('[BackupManager] Cuentas importadas, el usuario deberá desbloquear el keyring después')

      // Esperar un momento para asegurar que IndexedDB se haya actualizado completamente
      // después de que todas las transacciones se completen
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refrescar datos en el keyring para actualizar el estado de React
      console.log('[BackupManager] Refrescando datos del keyring...')
      const hasAccounts = await refreshStoredAccounts()
      const hasWebAuthn = await refreshWebAuthnCredentials()
      console.log(`[BackupManager] Datos refrescados - hasAccounts: ${hasAccounts}, hasWebAuthn: ${hasWebAuthn}`)

      // Mostrar resumen
          const totalImported = 
            result.accountsImported +
            result.contactsImported +
            result.apiConfigsImported +
            result.webauthnImported +
            result.transactionsImported

          if (totalImported > 0) {
            const parts = [
              `${result.accountsImported} ${t('backup.account')}`,
              `${result.contactsImported} ${t('backup.contact')}`,
              `${result.apiConfigsImported} ${t('backup.apiConfig')}`,
              `${result.webauthnImported} ${t('backup.webauthnCredential')}`,
              `${result.transactionsImported} ${t('backup.transaction')}`,
            ]
            if (result.mountainLogsImported > 0) {
              parts.push(`${result.mountainLogsImported} ${t('backup.mountainLog')}`)
            }
            if (result.documentsImported > 0) {
              parts.push(`${result.documentsImported} ${t('backup.document')}`)
            }
            setSuccess(`${t('backup.importSuccess')}: ${parts.join(', ')}`)
      } else {
        setSuccess(t('backup.importSuccessNoData'))
      }

      if (result.errors.length > 0) {
        console.warn('[Backup] Errores durante la importación:', result.errors)
      }

      setIsDialogOpen(false)
      ;(window as any).__pendingBackup = undefined

      // Si se importaron cuentas, notificar al componente padre
      if (result.accountsImported > 0) {
        // Notificar al componente padre (si existe callback)
        if (onImportComplete) {
          onImportComplete()
        }
        
        // Esperar un poco más para asegurar que el estado se haya actualizado
        // y luego recargar la página para que el AuthGuard detecte las nuevas cuentas
        // y muestre automáticamente la pantalla de unlock
        setTimeout(() => {
          console.log('[BackupManager] Recargando página para que AuthGuard detecte las nuevas cuentas...')
          window.location.reload()
        }, 2000)
      }
    } catch (err) {
      console.error('[BackupManager] Error durante importación:', err)
      setError(err instanceof Error ? err.message : t('backup.importError'))
    } finally {
      console.log('[BackupManager] Finalizando importación...')
      setIsImporting(false)
      setImportPassword('') // Limpiar contraseña después de importar
    }
  }

  const backup = (window as any).__pendingBackup as BackupData | undefined
  const backupDate = backup ? new Date(backup.createdAt).toLocaleString() : ''
  const accountsCount = backup?.accounts?.length || 0
  const contactsCount = backup?.contacts?.length || 0
  const apiConfigsCount = backup?.apiConfigs?.length || 0
  const webauthnCount = backup?.webauthnCredentials?.length || 0
  const mountainLogsCount = backup?.mountainLogs?.length || 0
  const documentsCount = backup?.documents?.length || 0
  const includesImages = backup?.metadata?.includesImages || false
  const includesPDFs = backup?.metadata?.includesPDFs || false

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t('backup.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('backup.description')}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {importResult && importResult.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('backup.importErrors')}</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {importResult.errors.map((err, idx) => (
                <li key={idx} className="text-sm">{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Exportar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('backup.exportTitle')}
            </CardTitle>
            <CardDescription>
              {t('backup.exportDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">{t('backup.exportOptions')}</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeImages"
                    checked={exportOptions.includeImages}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeImages: checked === true })
                    }
                  />
                  <Label htmlFor="includeImages" className="text-sm font-normal cursor-pointer">
                    {t('backup.includeImages')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includePDFs"
                    checked={exportOptions.includePDFs}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includePDFs: checked === true })
                    }
                  />
                  <Label htmlFor="includePDFs" className="text-sm font-normal cursor-pointer">
                    {t('backup.includePDFs')}
                  </Label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('backup.exportOptionsHelp')}
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <Download className="mr-2 h-4 w-4 animate-spin" />
                  {t('backup.exporting')}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t('backup.download')}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t('backup.fileIncludes')} {exportOptions.includeImages || exportOptions.includePDFs ? t('backup.fileIncludesWithFiles') : t('backup.fileIncludesWithoutFiles')}
            </p>
          </CardContent>
        </Card>

        {/* Importar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t('backup.importTitle')}
            </CardTitle>
            <CardDescription>
              {t('backup.importDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              variant="outline"
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  {t('backup.processing')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('backup.selectFile')}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              {t('backup.selectFileHelp')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmación de importación */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto mx-4 sm:mx-0">
          <DialogHeader>
            <DialogTitle>{t('backup.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('backup.confirmDesc')}
            </DialogDescription>
          </DialogHeader>

          {backup && (
            <div className="space-y-4 py-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('backup.backupInfo')}</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>{t('backup.createdDate')}: {backupDate}</li>
                    <li>{t('backup.version')}: {backup.version}</li>
                    <li>{t('backup.accounts')}: {accountsCount}</li>
                    <li>{t('backup.contacts')}: {contactsCount}</li>
                    <li>{t('backup.apiConfigs')}: {apiConfigsCount}</li>
                    <li>{t('backup.webauthnCredentials')}: {webauthnCount}</li>
                    {mountainLogsCount > 0 && (
                      <li>{t('backup.mountainLogs')}: {mountainLogsCount} {includesImages ? t('backup.withImages') : t('backup.onlyMetadata')}</li>
                    )}
                    {documentsCount > 0 && (
                      <li>{t('backup.documents')}: {documentsCount} {includesPDFs ? t('backup.withPDFs') : t('backup.onlyMetadata')}</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">{t('backup.importOptions')}</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('backup.importOptionsDesc')}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="overwriteAccounts"
                      checked={importOptions.overwriteAccounts}
                      onCheckedChange={(checked) =>
                        setImportOptions({ ...importOptions, overwriteAccounts: checked === true })
                      }
                    />
                    <Label htmlFor="overwriteAccounts" className="cursor-pointer">
                      {t('backup.overwriteAccounts')} ({accountsCount} {t('backup.account')})
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="overwriteContacts"
                      checked={importOptions.overwriteContacts}
                      onCheckedChange={(checked) =>
                        setImportOptions({ ...importOptions, overwriteContacts: checked === true })
                      }
                    />
                    <Label htmlFor="overwriteContacts" className="cursor-pointer">
                      {t('backup.overwriteContacts')} ({contactsCount} {t('backup.contact')})
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="overwriteApiConfigs"
                      checked={importOptions.overwriteApiConfigs}
                      onCheckedChange={(checked) =>
                        setImportOptions({ ...importOptions, overwriteApiConfigs: checked === true })
                      }
                    />
                    <Label htmlFor="overwriteApiConfigs" className="cursor-pointer">
                      {t('backup.overwriteApiConfigs')} ({apiConfigsCount} {t('backup.apiConfig')})
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="overwriteWebAuthn"
                      checked={importOptions.overwriteWebAuthn}
                      onCheckedChange={(checked) =>
                        setImportOptions({ ...importOptions, overwriteWebAuthn: checked === true })
                      }
                    />
                    <Label htmlFor="overwriteWebAuthn" className="cursor-pointer">
                      {t('backup.overwriteWebAuthn')} ({webauthnCount} {t('backup.webauthnCredential')})
                    </Label>
                  </div>

                  {mountainLogsCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwriteMountainLogs"
                        checked={importOptions.overwriteMountainLogs}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, overwriteMountainLogs: checked === true })
                        }
                      />
                      <Label htmlFor="overwriteMountainLogs" className="cursor-pointer">
                        {t('backup.overwriteMountainLogs')} ({mountainLogsCount} {t('backup.mountainLog')})
                      </Label>
                    </div>
                  )}

                  {documentsCount > 0 && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="overwriteDocuments"
                        checked={importOptions.overwriteDocuments}
                        onCheckedChange={(checked) =>
                          setImportOptions({ ...importOptions, overwriteDocuments: checked === true })
                        }
                      />
                      <Label htmlFor="overwriteDocuments" className="cursor-pointer">
                        {t('backup.overwriteDocuments')} ({documentsCount} {t('backup.document')})
                      </Label>
                    </div>
                  )}
                </div>

                {/* Campo de contraseña si hay cuentas en el backup */}
                {backup.accounts && backup.accounts.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="importPassword">{t('backup.backupPassword')} *</Label>
                    <div className="relative">
                      <Input
                        id="importPassword"
                        type={showPassword ? 'text' : 'password'}
                        value={importPassword}
                        onChange={(e) => {
                          setImportPassword(e.target.value)
                          setPasswordError(null)
                        }}
                        placeholder={t('backup.backupPasswordPlaceholder')}
                        className={passwordError ? 'border-destructive' : ''}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {passwordError && (
                      <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t('backup.backupPasswordHelp')}
                    </p>
                  </div>
                )}

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {t('backup.importWarning')}
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                ;(window as any).__pendingBackup = undefined
                setIsImporting(false)
              }}
              disabled={isImporting}
            >
              {t('backup.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                isImporting || 
                (backup?.accounts && backup.accounts.length > 0 && !importPassword)
              }
            >
              {isImporting ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  {t('backup.importing')}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('backup.import')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

