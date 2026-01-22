import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Save, ExternalLink, Key, Globe, Shield, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'
import { WebAuthnCredentialsManager } from '@/components/WebAuthnCredentialsManager'
import { DatabaseManager } from '@/components/DatabaseManager'
import { BackupManager } from '@/components/BackupManager'

interface ApiConfig {
  id: string
  name: string
  baseUrl: string
  apiKey?: string
  description?: string
  type: 'credential' | 'medical' | 'attestation' | 'other'
  enabled: boolean
  createdAt: number
  updatedAt: number
}

// Simulación de almacenamiento (temporal, hasta que se implemente la DB completa)
const API_CONFIGS_STORAGE_KEY = 'aura-wallet-api-configs'

function useApiConfigsStorage() {
  const [configs, setConfigs] = useState<ApiConfig[]>([])

  useEffect(() => {
    const stored = localStorage.getItem(API_CONFIGS_STORAGE_KEY)
    if (stored) {
      try {
        setConfigs(JSON.parse(stored))
      } catch (e) {
        console.error('Error loading API configs:', e)
      }
    }
  }, [])

  const saveConfigs = (newConfigs: ApiConfig[]) => {
    setConfigs(newConfigs)
    localStorage.setItem(API_CONFIGS_STORAGE_KEY, JSON.stringify(newConfigs))
  }

  const addConfig = (config: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newConfig: ApiConfig = {
      ...config,
      id: `api-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    const updated = [...configs, newConfig]
    saveConfigs(updated)
    return newConfig
  }

  const updateConfig = (id: string, updates: Partial<ApiConfig>) => {
    const updated = configs.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    )
    saveConfigs(updated)
  }

  const deleteConfig = (id: string) => {
    const updated = configs.filter(c => c.id !== id)
    saveConfigs(updated)
  }

  return {
    configs,
    addConfig,
    updateConfig,
    deleteConfig,
  }
}

export default function Settings() {
  const { configs, addConfig, updateConfig, deleteConfig } = useApiConfigsStorage()
  const { language, setLanguage, t } = useI18n()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    description: '',
    type: 'credential' as ApiConfig['type'],
    enabled: true,
  })

  const handleOpenDialog = (config?: ApiConfig) => {
    if (config) {
      setEditingConfig(config)
      setFormData({
        name: config.name,
        baseUrl: config.baseUrl,
        apiKey: config.apiKey || '',
        description: config.description || '',
        type: config.type,
        enabled: config.enabled,
      })
    } else {
      setEditingConfig(null)
      setFormData({
        name: '',
        baseUrl: '',
        apiKey: '',
        description: '',
        type: 'credential',
        enabled: true,
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingConfig(null)
    setFormData({
      name: '',
      baseUrl: '',
      apiKey: '',
      description: '',
      type: 'credential',
      enabled: true,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.baseUrl.trim()) {
      return
    }

    if (editingConfig) {
      updateConfig(editingConfig.id, {
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        apiKey: formData.apiKey.trim() || undefined,
        description: formData.description.trim() || undefined,
        type: formData.type,
        enabled: formData.enabled,
      })
    } else {
      addConfig({
        name: formData.name.trim(),
        baseUrl: formData.baseUrl.trim(),
        apiKey: formData.apiKey.trim() || undefined,
        description: formData.description.trim() || undefined,
        type: formData.type,
        enabled: formData.enabled,
      })
    }

    handleCloseDialog()
  }

  const getTypeLabel = (type: ApiConfig['type']) => {
    const labels = {
      credential: t('settings.apis.typeCredential'),
      medical: t('settings.apis.typeMedical'),
      attestation: t('settings.apis.typeAttestation'),
      other: t('settings.apis.typeOther'),
    }
    return labels[type]
  }

  const getTypeIcon = (type: ApiConfig['type']) => {
    switch (type) {
      case 'credential':
        return <Key className="h-4 w-4" />
      case 'medical':
        return <Shield className="h-4 w-4" />
      case 'attestation':
        return <Globe className="h-4 w-4" />
      default:
        return <ExternalLink className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('settings.description')}
        </p>
      </div>

      <Tabs defaultValue="apis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apis">{t('settings.apis')}</TabsTrigger>
          <TabsTrigger value="general">{t('settings.general')}</TabsTrigger>
          <TabsTrigger value="security">{t('settings.security')}</TabsTrigger>
        </TabsList>

        {/* APIs Externas */}
        <TabsContent value="apis" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('settings.apis.title')}</CardTitle>
                  <CardDescription>
                    {t('settings.apis.description')}
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('settings.apis.addApi')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mx-4 sm:mx-0">
                    <DialogHeader>
                      <DialogTitle>
                        {editingConfig ? t('settings.apis.editApi') : t('settings.apis.newApi')}
                      </DialogTitle>
                      <DialogDescription>
                        {editingConfig
                          ? t('settings.apis.editApiDesc')
                          : t('settings.apis.newApiDesc')}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">{t('settings.apis.name')} *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('settings.apis.namePlaceholder')}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="baseUrl">{t('settings.apis.baseUrl')} *</Label>
                        <Input
                          id="baseUrl"
                          type="url"
                          value={formData.baseUrl}
                          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                          placeholder={t('settings.apis.baseUrlPlaceholder')}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apiKey">{t('settings.apis.apiKey')}</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          value={formData.apiKey}
                          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder={t('settings.apis.apiKeyPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">{t('settings.apis.type')} *</Label>
                        <select
                          id="type"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as ApiConfig['type'] })}
                          required
                        >
                          <option value="credential">{t('settings.apis.typeCredential')}</option>
                          <option value="medical">{t('settings.apis.typeMedical')}</option>
                          <option value="attestation">{t('settings.apis.typeAttestation')}</option>
                          <option value="other">{t('settings.apis.typeOther')}</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">{t('settings.apis.description')}</Label>
                        <Input
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t('settings.apis.descriptionPlaceholder')}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enabled"
                          checked={formData.enabled}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="enabled" className="cursor-pointer">
                          {t('settings.apis.enabled')}
                        </Label>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={handleCloseDialog}>
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                          <Save className="mr-2 h-4 w-4" />
                          {editingConfig ? t('settings.apis.saveChanges') : t('settings.apis.addApi')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="mb-4">{t('settings.apis.noApis')}</p>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('settings.apis.addFirstApi')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {configs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {getTypeIcon(config.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{config.name}</h3>
                            <Badge variant={config.enabled ? 'default' : 'secondary'}>
                              {config.enabled ? t('settings.apis.enabledStatus') : t('settings.apis.disabledStatus')}
                            </Badge>
                            <Badge variant="outline">{getTypeLabel(config.type)}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {config.baseUrl}
                          </p>
                          {config.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {config.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(config)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(t('settings.apis.deleteConfirm'))) {
                              deleteConfig(config.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              {t('settings.apis.securityNote')}
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* General */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.general')}</CardTitle>
              <CardDescription>
                {t('settings.generalDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.language')}</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                >
                  <option value="es">{t('settings.spanish')}</option>
                  <option value="en">{t('settings.english')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.currency')}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="DOT">DOT</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.legalInfo')}</CardTitle>
              <CardDescription>
                {t('settings.legalInfoDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/about">
                  <Info className="mr-2 h-4 w-4" />
                  {t('settings.viewAbout')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seguridad */}
        <TabsContent value="security" className="space-y-4">
          <WebAuthnCredentialsManager />

          <Card data-section="backup">
            <CardHeader>
              <CardTitle>{t('settings.backup.title')}</CardTitle>
              <CardDescription>
                {t('settings.backup.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BackupManager />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.data.title')}</CardTitle>
              <CardDescription>
                {t('settings.data.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DatabaseManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
