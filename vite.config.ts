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

// Calcular el base path dinámicamente
// IMPORTANTE: Esto se ejecuta cuando se carga el módulo, así que las variables de entorno
// deben estar disponibles en ese momento (lo cual es el caso en GitHub Actions)
const basePath = getBase()

// Log para debugging (siempre, para ver qué está pasando)
console.log('[Vite Config] Base path calculado:', basePath)
console.log('[Vite Config] GITHUB_REPOSITORY:', process.env.GITHUB_REPOSITORY)
console.log('[Vite Config] NODE_ENV:', process.env.NODE_ENV)
console.log('[Vite Config] VITE_BASE_URL:', process.env.VITE_BASE_URL)

// Verificar que el base path sea correcto
if (process.env.NODE_ENV === 'production') {
  if (!basePath || basePath === '/') {
    console.warn('[Vite Config] ⚠️ Base path es "/". Si estás desplegando en GitHub Pages, esto podría causar problemas.')
    console.warn('[Vite Config] GITHUB_REPOSITORY debería estar configurado en el workflow de GitHub Actions.')
    console.warn('[Vite Config] Usando fallback: /emergency-wallet-pwa/')
  } else {
    console.log('[Vite Config] ✅ Base path configurado correctamente para GitHub Pages:', basePath)
  }
}

// Plugin para transformar rutas en index.html durante el build
// IMPORTANTE: Este plugin debe ejecutarse DESPUÉS de que Vite transforme los scripts
// Por eso usamos enforce: 'post' para ejecutarlo al final
const transformHtmlPlugin = () => {
  return {
    name: 'transform-html',
    enforce: 'post', // Ejecutar después de otros plugins para que Vite ya haya transformado los scripts
    transformIndexHtml(html: string) {
      // En producción, reemplazar rutas absolutas con base path
      if (process.env.NODE_ENV === 'production' && basePath !== '/') {
        let transformed = html
        
        // Verificar que Vite haya transformado el script (debug)
        if (transformed.includes('/src/main.tsx')) {
          console.error('[transformHtmlPlugin] ❌ ERROR: HTML todavía contiene /src/main.tsx después de la transformación de Vite')
          console.error('[transformHtmlPlugin] Esto significa que Vite no transformó el script correctamente')
          console.error('[transformHtmlPlugin] Base path configurado:', basePath)
          console.error('[transformHtmlPlugin] HTML actual:', transformed.substring(0, 500))
          // Esto no debería pasar, pero si pasa, es un error crítico
          throw new Error('Vite no transformó /src/main.tsx correctamente. Verifica la configuración del base path.')
        }
        
        // Reemplazar rutas absolutas de favicons y otros assets estáticos
        // Nota: Vite ya debería haber transformado src="/src/main.tsx" a los archivos compilados
        // Solo necesitamos ajustar las rutas de assets estáticos que Vite no transforma
        transformed = transformed
          .replace(/href="\/(favicon|apple-touch-icon)/g, `href="${basePath}$1`)
        
        // Asegurar que todas las rutas de assets compilados tengan el base path
        // Vite debería hacer esto automáticamente, pero por si acaso:
        if (basePath !== '/') {
          // Reemplazar rutas de scripts y estilos que empiecen con /assets/ pero no tengan el base path
          transformed = transformed.replace(
            /(src|href)="\/assets\//g, 
            `$1="${basePath}assets/`
          )
        }
        
        return transformed
      }
      return html
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // IMPORTANTE: El base path debe estar configurado aquí para que Vite transforme
  // correctamente todas las rutas en el HTML, incluyendo /src/main.tsx
  // Vite transformará automáticamente /src/main.tsx a /base-path/assets/main-[hash].js
  base: basePath,
  publicDir: 'public', // Asegurar que la carpeta public se copie correctamente
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
      includeAssets: [
        'favicon.ico', 
        'favicon.svg', 
        'favicon-96x96.png',
        'apple-touch-icon.png',
        'web-app-manifest-192x192.png',
        'web-app-manifest-512x512.png'
      ],
      base: getBase(),
      scope: getBase(),
      strategies: 'generateSW',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        navigateFallback: basePath === '/' ? '/index.html' : basePath + 'index.html',
        navigateFallbackDenylist: [
          /^\/_/, 
          /\/[^/?]+\.[^/]+$/,
          // Excluir rutas de desarrollo de Vite
          /^\/@vite\/client/,
          /^\/@react-refresh/,
          /^\/@vite-plugin-pwa/,
          /^\/node_modules\/\.vite/,
          /^\/src\/.*\.(tsx?|jsx?)$/,
        ],
        // Excluir servicios de mapas del procesamiento de Workbox completamente
        // Esto previene que Workbox intente procesar estas URLs
        navigateFallbackAllowlist: undefined,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // En desarrollo, no intentar precachear recursos que no existen
        // Esto reduce los warnings de "Precaching did not find a match"
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Ignorar rutas de desarrollo de Vite - NetworkOnly (no cachear)
            urlPattern: ({ url }: { url: URL }) => {
              const isDevRoute = 
                url.pathname.startsWith('/@vite/') ||
                url.pathname.startsWith('/@react-refresh') ||
                url.pathname.startsWith('/@vite-plugin-pwa/') ||
                url.pathname.startsWith('/node_modules/.vite/') ||
                (url.pathname.startsWith('/src/') && /\.(tsx?|jsx?)$/.test(url.pathname))
              return isDevRoute
            },
            handler: 'NetworkOnly',
            options: {
              // No cachear rutas de desarrollo
              cacheableResponse: {
                statuses: [0, 200] // Aceptar cualquier respuesta pero no cachear
              }
            }
          },
          {
            // Regla específica para staticmap - NO interceptar estas URLs
            // Workbox no debe procesar estas URLs en absoluto para evitar errores
            urlPattern: /^https:\/\/.*staticmap\.openstreetmap\.(de|org|fr)\/.*/,
            handler: 'NetworkOnly',
            options: {
              // No cachear nada, solo intentar la red
              // Si falla, devolver error silenciosamente sin cachear
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            // Regla para tiles de OpenStreetMap - también NetworkOnly
            urlPattern: /^https:\/\/.*\.tile\.openstreetmap\.org\/.*/,
            handler: 'NetworkOnly',
            options: {
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            // Regla general para otros recursos externos
            // Excluir explícitamente servicios de mapas de OpenStreetMap
            urlPattern: ({ url }: { url: URL }) => {
              // Solo procesar URLs HTTPS que NO sean de servicios de mapas
              const isMapService = 
                url.hostname.includes('staticmap.openstreetmap') ||
                url.hostname.includes('tile.openstreetmap.org') ||
                url.hostname.includes('openstreetmap.org')
              return url.protocol === 'https:' && !isMapService
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
        // Nota: En desarrollo, Workbox puede mostrar warnings sobre rutas de Vite
        // (como /@vite/client, /src/main.tsx, etc.) que no existen en producción.
        // Estos warnings son normales y no afectan el funcionamiento.
        // Las rutas de desarrollo están configuradas para ser ignoradas en navigateFallbackDenylist.
      },
      // injectRegister ya está definido arriba (línea 115), no duplicar
      injectManifest: false
    }),
    // IMPORTANTE: Este plugin debe ejecutarse al final para verificar que Vite
    // haya transformado correctamente el HTML, especialmente /src/main.tsx
    transformHtmlPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Asegurar que buffer se resuelva correctamente y esté disponible globalmente
      // Esto permite que el código del cliente acceda a buffer.Buffer
      buffer: 'buffer',
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
    // Asegurar que buffer no se externalice
    exclude: [],
  },
  // Configuración para no externalizar buffer
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // NO externalizar buffer - debe estar incluido en el bundle del cliente
      // Si externalizamos buffer, el código del cliente no podrá acceder a buffer.Buffer
      external: (id) => {
        // Solo externalizar módulos de Node.js que realmente no se pueden usar en el navegador
        // y que no son necesarios para el código del cliente
        const nodeOnlyModules = ['fs', 'path', 'os', 'crypto', 'http', 'https', 'net', 'tls', 'stream', 'util', 'events', 'url', 'querystring', 'zlib', 'readline', 'child_process']
        if (nodeOnlyModules.includes(id) || id.startsWith('node:')) {
          return true
        }
        // NO externalizar buffer - debe estar en el bundle
        return false
      },
    },
  },
})

