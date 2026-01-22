/**
 * Página: Acerca de
 * Muestra información sobre Emergency Wallet, Términos y Condiciones, y Aviso de Privacidad
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Info, Shield, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/contexts/I18nContext'

export default function About() {
  const { t, language } = useI18n()
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
          <Link to="/settings">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.back')}</span>
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t('about.title')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('about.description')}
          </p>
        </div>
      </div>

      {/* Información de la Aplicación */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <img 
                src={`${import.meta.env.BASE_URL}web-app-manifest-192x192.png`}
                alt="Emergency Wallet Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <CardTitle className="text-xl sm:text-2xl">Emergency Wallet</CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {t('onboarding.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm sm:text-base">{t('about.appDescription').split('.')[0]}</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              {t('about.appDescription')}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm sm:text-base">{t('about.features')}</h3>
            <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground">
              <li>Monitoreo en tiempo real de la blockchain</li>
              <li>Detección automática de emergencias</li>
              <li>Gestión de emergencias descentralizada</li>
              <li>Almacenamiento seguro y privado</li>
              <li>Funcionamiento offline</li>
              <li>Interfaz optimizada para móviles</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-sm sm:text-base">{t('about.version')}</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              1.0.0
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs para Términos y Privacidad */}
      <Card>
        <CardHeader>
          <CardTitle>{t('about.legalInfo')}</CardTitle>
          <CardDescription>
            {t('about.legalInfoDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="terms" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="terms" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">{t('about.terms')}</span>
                <span className="sm:hidden">{t('about.terms').split(' ')[0]}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t('about.privacy')}</span>
                <span className="sm:hidden">{t('about.privacy').split(' ')[0]}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terms" className="space-y-4 mt-4">
              <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                <h2 className="text-lg sm:text-xl font-bold">{t('about.terms')}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('about.lastUpdated')}: {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                <section className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">1. {t('terms.acceptance')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('terms.acceptanceDesc')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">2. {t('terms.service')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('terms.serviceDesc')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground ml-4 mt-2">
                      <li>{t('terms.serviceList1')}</li>
                      <li>{t('terms.serviceList2')}</li>
                      <li>{t('terms.serviceList3')}</li>
                      <li>{t('terms.serviceList4')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">3. {t('terms.responsibility')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong>3.1. {t('terms.responsibilityKeys').split(':')[0]}:</strong> {t('terms.responsibilityKeys').split(':')[1].trim()}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      <strong>3.2. {t('terms.responsibilityUse').split(':')[0]}:</strong> {t('terms.responsibilityUse').split(':')[1].trim()}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      <strong>3.3. {t('terms.responsibilityVerify').split(':')[0]}:</strong> {t('terms.responsibilityVerify').split(':')[1].trim()}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">4. {t('terms.liability')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('terms.liabilityDesc')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground ml-4 mt-2">
                      <li>{t('terms.liabilityList1')}</li>
                      <li>{t('terms.liabilityList2')}</li>
                      <li>{t('terms.liabilityList3')}</li>
                      <li>{t('terms.liabilityList4')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">5. {t('terms.modifications')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('terms.modificationsDesc')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">6. {t('terms.intellectual')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('terms.intellectualDesc')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">7. {t('terms.contact')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('terms.contactDesc')}
                    </p>
                  </div>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4 mt-4">
              <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
                <h2 className="text-lg sm:text-xl font-bold">{t('about.privacy')}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('about.lastUpdated')}: {new Date().toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>

                <section className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">1. {t('privacy.infoCollected')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong>1.1. {t('privacy.infoLocal').split(':')[0]}:</strong> {t('privacy.infoLocal').split(':')[1].trim()}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground ml-4 mt-2">
                      <li>{t('privacy.infoLocalList1')}</li>
                      <li>{t('privacy.infoLocalList2')}</li>
                      <li>{t('privacy.infoLocalList3')}</li>
                      <li>{t('privacy.infoLocalList4')}</li>
                    </ul>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      <strong>1.2. {t('privacy.infoBlockchain').split(':')[0]}:</strong> {t('privacy.infoBlockchain').split(':')[1].trim()}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">2. {t('privacy.infoUse')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('privacy.infoUseDesc')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground ml-4 mt-2">
                      <li>{t('privacy.infoUseList1')}</li>
                      <li>{t('privacy.infoUseList2')}</li>
                      <li>{t('privacy.infoUseList3')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">3. {t('privacy.storage')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong>3.1. {t('privacy.storageLocal').split(':')[0]}:</strong> {t('privacy.storageLocal').split(':')[1].trim()}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      <strong>3.2. {t('privacy.storageEncryption').split(':')[0]}:</strong> {t('privacy.storageEncryption').split(':')[1].trim()}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      <strong>3.3. {t('privacy.storageNoServers').split(':')[0]}:</strong> {t('privacy.storageNoServers').split(':')[1].trim()}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">4. {t('privacy.sharing')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      <strong>4.1. {t('privacy.sharingNoShare').split(':')[0]}:</strong> {t('privacy.sharingNoShare').split(':')[1].trim()}
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground mt-2">
                      <strong>4.2. {t('privacy.sharingBlockchain').split(':')[0]}:</strong> {t('privacy.sharingBlockchain').split(':')[1].trim()}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">5. {t('privacy.rights')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('privacy.rightsDesc')}
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm sm:text-base text-muted-foreground ml-4 mt-2">
                      <li>{t('privacy.rightsList1')}</li>
                      <li>{t('privacy.rightsList2')}</li>
                      <li>{t('privacy.rightsList3')}</li>
                      <li>{t('privacy.rightsList4')}</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">6. {t('privacy.cookies')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('privacy.cookiesDesc')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">7. {t('privacy.changes')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('privacy.changesDesc')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-2">8. {t('privacy.contact')}</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {t('privacy.contactDesc')}
                    </p>
                  </div>
                </section>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
