import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import os from 'os'

// Detectar si existen certificados SSL
const httpsConfig = (() => {
  const certPath = path.resolve(__dirname, '.certs/cert.pem')
  const keyPath = path.resolve(__dirname, '.certs/key.pem')
  
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    }
  }
  return false
})()

// Obtener IP local para acceso desde móvil
function getLocalIP(): string {
  try {
    const interfaces = os.networkInterfaces()
    if (!interfaces) return 'localhost'
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address
        }
      }
    }
  } catch {
    // Si no se puede obtener, usar localhost
  }
  return 'localhost'
}

const LOCAL_IP = getLocalIP()

// Detectar si estamos en GitHub Pages
// Si el repositorio no es username.github.io, necesitamos el base path
const getBase = () => {
  // Si hay una variable de entorno VITE_BASE_URL, usarla (útil para testing)
  if (process.env.VITE_BASE_URL) {
    return process.env.VITE_BASE_URL
  }
  
  // En desarrollo, no usar base
  if (process.env.NODE_ENV === 'development') {
    return '/'
  }
  
  // En producción (build), usar el nombre del repositorio como base si existe
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  // Si el repo es username.github.io, usar /, sino usar /repo-name/
  if (repoName && !repoName.includes('.github.io')) {
    return `/${repoName}/`
  }
  
  // Fallback: si no hay GITHUB_REPOSITORY pero estamos en build, usar el nombre del repo
  // El repositorio es emergency-wallet-pwa según el package.json
  // Hardcodeamos el base path para GitHub Pages
  // Cambiar esto si el nombre del repositorio cambia
  return '/emergency-wallet-pwa/'
}

// Calcular el base path dinámicamente (se recalcula cada vez que se accede)
// Esto asegura que las variables de entorno estén disponibles durante el build
const basePath = getBase()

// Log para debugging (siempre, para ver qué está pasando)
console.log('[Vite Config] Base path calculado:', basePath)
console.log('[Vite Config] GITHUB_REPOSITORY:', process.env.GITHUB_REPOSITORY)
console.log('[Vite Config] NODE_ENV:', process.env.NODE_ENV)
console.log('[Vite Config] VITE_BASE_URL:', process.env.VITE_BASE_URL)

// Verificar que el base path sea correcto
if (process.env.NODE_ENV === 'production' && (!basePath || basePath === '/')) {
  console.warn('[Vite Config] ⚠️ Base path es "/". Si estás desplegando en GitHub Pages, esto podría causar problemas.')
  console.warn('[Vite Config] GITHUB_REPOSITORY debería estar configurado en el workflow de GitHub Actions.')
  console.warn('[Vite Config] Usando fallback: /emergency-wallet-pwa/')
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  server: {
    host: '0.0.0.0', // Permitir acceso desde la red local
    port: 9110,
    // Deshabilitar HTTPS para desarrollo (comentar si necesitas HTTPS)
    // https: httpsConfig || undefined,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      base: getBase(),
      scope: getBase(),
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: basePath === '/' ? '/index.html' : basePath + 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        // Excluir servicios de mapas del procesamiento de Workbox completamente
        // Esto previene que Workbox intente procesar estas URLs
        navigateFallbackAllowlist: undefined,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB (aumentado de 2 MB por defecto)
        runtimeCaching: [
          {
            // Regla específica para staticmap - NetworkOnly para que no intente cachear
            // Esta regla debe ir ANTES de la regla general para tener prioridad
            urlPattern: /^https:\/\/.*staticmap\.openstreetmap\.(de|org|fr)\/.*/,
            handler: 'NetworkOnly',
            options: {
              // No cachear nada, solo intentar la red
              // Si falla, el error se propaga normalmente al componente sin que Workbox interfiera
            }
          },
          {
            // Regla general para otros recursos externos
            // Excluir explícitamente staticmap para que use la regla anterior (NetworkOnly)
            urlPattern: ({ url }: { url: URL }) => {
              // Solo procesar URLs HTTPS que NO sean de staticmap
              return url.protocol === 'https:' && !url.hostname.includes('staticmap.openstreetmap')
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              },
              matchOptions: {
                ignoreSearch: false,
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Emergency Wallet',
        short_name: 'EmergencyWallet',
        description: 'PWA para detectar y gestionar emergencias en blockchain',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: getBase(),
        categories: ['utilities', 'productivity', 'emergency'],
        lang: 'es',
        dir: 'ltr',
        icons: [
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'web-app-manifest-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'web-app-manifest-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [],
        shortcuts: [
          {
            name: 'Radio Blockchain',
            short_name: 'Radio',
            description: 'Monitor de eventos de blockchain',
            url: basePath,
            icons: [{ src: 'web-app-manifest-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Emergencias',
            short_name: 'Emergencias',
            description: 'Ver emergencias detectadas',
            url: basePath + 'emergencies',
            icons: [{ src: 'web-app-manifest-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {},
    'global': 'globalThis',
    'process.browser': true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
    include: ['buffer'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})

