# Optimización de LCP (Largest Contentful Paint)

## Problema Actual
- **LCP**: 6.02s (objetivo: < 2.5s) ❌
- **CLS**: 0 ✅
- **INP**: 80ms ✅

## Análisis del Problema

El elemento LCP es un `CardTitle` (div con clases `font-semibold tracking-tight text-2xl`) que se renderiza después de:

1. **Polyfills síncronos** (~100-200ms)
2. **Inicialización de React** (~50-100ms)
3. **7 Providers anidados** que hacen trabajo pesado:
   - `KeyringProvider`: Espera `cryptoWaitReady()` (~500-1000ms)
   - `NetworkProvider`: Conecta WebSocket inmediatamente
   - `ActiveAccountProvider`: Carga cuentas desde IndexedDB
   - `RemarkListenerProvider`: Inicia escucha de blockchain
   - `RadioMonitorProvider`: Inicializa monitoreo
4. **AuthGuard**: Bloquea renderizado hasta que `isReady = true`

## Optimizaciones Implementadas

### 1. ✅ Skeleton en lugar de Spinner
- Cambiado `AuthGuard` para mostrar skeleton inmediatamente
- Permite que el navegador renderice contenido visible más rápido

### 2. 🔄 Optimizaciones Pendientes

#### A. Mover Polyfills a Carga Asíncrona
```typescript
// En lugar de importar Buffer síncronamente, cargarlo de forma asíncrona
// después de que React se monte
```

#### B. Optimizar Inicialización del Keyring
- Hacer `cryptoWaitReady()` no bloqueante
- Mostrar UI inmediatamente, inicializar en background

#### C. Lazy Load de Providers Pesados
- Cargar `RemarkListenerProvider` y `RadioMonitorProvider` solo cuando se necesiten
- No iniciar conexiones WebSocket hasta que el usuario interactúe

#### D. Pre-renderizar Contenido Crítico
- Agregar contenido estático en el HTML inicial
- Usar SSR o SSG para el contenido crítico

## Recomendaciones Prioritarias

### Prioridad Alta (Impacto Alto)

1. **Hacer Keyring no bloqueante**
   ```typescript
   // En useKeyring.ts
   // Inicializar en background, no bloquear renderizado
   useEffect(() => {
     // Marcar como ready inmediatamente para UI
     setIsReady(true)
     
     // Inicializar en background
     initKeyring().catch(console.error)
   }, [])
   ```

2. **Lazy load de conexiones WebSocket**
   ```typescript
   // No conectar hasta que el usuario navegue a una página que lo necesite
   // O después de un delay (ej: 2 segundos)
   ```

3. **Pre-renderizar HTML crítico**
   ```html
   <!-- En index.html, agregar skeleton HTML estático -->
   <div id="root">
     <div class="skeleton-header">...</div>
     <div class="skeleton-content">...</div>
   </div>
   ```

### Prioridad Media (Impacto Medio)

4. **Code splitting más agresivo**
   - Separar providers en chunks independientes
   - Cargar solo lo necesario para la ruta actual

5. **Optimizar imports**
   - Usar tree-shaking más efectivo
   - Evitar importar librerías pesadas en el bundle inicial

### Prioridad Baja (Impacto Bajo)

6. **Optimizar CSS**
   - Critical CSS inline
   - Lazy load CSS no crítico

7. **Preload de recursos críticos**
   - Preload de fuentes
   - Preload de imágenes críticas

## Métricas Objetivo

- **LCP**: < 2.5s (actual: 6.02s)
- **CLS**: < 0.1 (actual: 0) ✅
- **INP**: < 200ms (actual: 80ms) ✅

## Próximos Pasos

1. Implementar inicialización no bloqueante del Keyring
2. Mover conexiones WebSocket a lazy load
3. Agregar skeleton HTML estático en index.html
4. Medir impacto de cada optimización
5. Iterar hasta alcanzar < 2.5s
