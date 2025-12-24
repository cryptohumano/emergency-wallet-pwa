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
  return '/'
}

// Calcular el base path dinámicamente (se recalcula cada vez que se accede)
// Esto asegura que las variables de entorno estén disponibles durante el build
const basePath = getBase()

// Log para debugging (solo en build)
if (process.env.NODE_ENV === 'production') {
  console.log('[Vite Config] Base path:', basePath)
  console.log('[Vite Config] GITHUB_REPOSITORY:', process.env.GITHUB_REPOSITORY)
  console.log('[Vite Config] NODE_ENV:', process.env.NODE_ENV)
  
  // Verificar que el base path sea correcto
  if (!basePath || basePath === '/') {
    console.warn('[Vite Config] ⚠️ Base path es "/". Si estás desplegando en GitHub Pages, esto podría causar problemas.')
    console.warn('[Vite Config] GITHUB_REPOSITORY debería estar configurado en el workflow de GitHub Actions.')
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  server: {
    host: '0.0.0.0', // Permitir acceso desde la red local
    port: 5173,
    // Deshabilitar HTTPS para desarrollo (comentar si necesitas HTTPS)
    // https: httpsConfig || undefined,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      base: getBase(),
      scope: getBase(),
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: basePath === '/' ? '/index.html' : basePath + 'index.html',
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB (aumentado de 2 MB por defecto)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'external-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Aura Wallet',
        short_name: 'Aura Wallet',
        description: 'Wallet criptográfica segura y privada para redes Substrate/Polkadot con WebAuthn, multi-cadena y gestión de identidad',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        start_url: getBase(),
        categories: ['finance', 'utilities', 'productivity'],
        lang: 'es',
        dir: 'ltr',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [],
        shortcuts: [
          {
            name: 'Inicio',
            short_name: 'Inicio',
            description: 'Ver resumen de cuentas y balances',
            url: basePath,
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Enviar',
            short_name: 'Enviar',
            description: 'Enviar tokens a otra dirección',
            url: basePath + 'send',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Cuentas',
            short_name: 'Cuentas',
            description: 'Gestionar cuentas del wallet',
            url: basePath + 'accounts',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Identidad',
            short_name: 'Identidad',
            description: 'Gestionar identidad y privacidad',
            url: basePath + 'identity',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
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
  },
})

