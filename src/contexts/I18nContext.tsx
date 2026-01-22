/**
 * Contexto de Internacionalización (i18n)
 * Maneja el idioma de la aplicación y las traducciones
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import esTranslations from '@/locales/es.json'
import enTranslations from '@/locales/en.json'

type Language = 'es' | 'en'
type Translations = typeof esTranslations

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

// Función helper para obtener traducciones anidadas
function getNestedTranslation(obj: any, path: string): string {
  const keys = path.split('.')
  let value: any = obj
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key]
    } else {
      // Si no se encuentra, intentar buscar en el objeto completo como fallback
      console.warn(`Translation key not found: ${path}`)
      return path // Retornar la clave si no se encuentra la traducción
    }
  }
  
  return typeof value === 'string' ? value : path
}

// Detectar idioma del navegador
function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined') return 'es'
  
  const browserLang = navigator.language || (navigator as any).userLanguage
  const langCode = browserLang.split('-')[0].toLowerCase()
  
  return langCode === 'en' ? 'en' : 'es'
}

// Cargar idioma guardado o detectar del navegador
function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'es'
  
  const saved = localStorage.getItem('emergency-wallet-language') as Language | null
  if (saved && (saved === 'es' || saved === 'en')) {
    return saved
  }
  
  return detectBrowserLanguage()
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)
  
  const translations: Record<Language, Translations> = {
    es: esTranslations,
    en: enTranslations,
  }

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('emergency-wallet-language', lang)
      // Actualizar el atributo lang del HTML
      document.documentElement.lang = lang
    }
  }

  // Función de traducción
  const t = (key: string): string => {
    const translation = translations[language]
    return getNestedTranslation(translation, key)
  }

  // Actualizar lang del HTML cuando cambia el idioma
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
