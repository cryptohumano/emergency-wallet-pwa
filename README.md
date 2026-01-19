# Emergency Wallet

Una Progressive Web App (PWA) especializada en detectar y gestionar emergencias en blockchain. La aplicación escucha constantemente eventos `System.Remarked` y `System.RemarkWithEvent` en la blockchain para detectar emergencias en tiempo real, funcionando como una "radio blockchain" que nunca se detiene.

## 🎯 Objetivo

Emergency Wallet es una PWA diseñada para rescatistas y servicios de emergencia que necesitan monitorear emergencias reportadas en blockchain. La aplicación:

1. **Escucha emergencias en tiempo real**: Escucha constantemente eventos `System.Remarked` y `System.RemarkWithEvent` en la blockchain
2. **Radio Blockchain**: Funciona como una radio que nunca se detiene, incluso cuando la pestaña está en segundo plano
3. **Detección automática**: Detecta y procesa automáticamente emergencias con formato `EMERGENCY:`
4. **Almacenamiento local**: Guarda emergencias en IndexedDB para acceso rápido y offline
5. **Identidad on-chain**: Consulta identidad de reportantes en People Chains (Polkadot, Kusama, Paseo)
6. **Notificaciones**: Alertas del navegador cuando se detectan nuevas emergencias
7. **Mapas interactivos**: Visualización de emergencias en mapas con rutas relacionadas

## 🚀 Características Principales

### 🚨 Sistema de Detección de Emergencias

* **Radio Blockchain** - Escucha constante de eventos en la blockchain, funcionando como una radio que nunca se detiene
* **Detección automática** - Detecta automáticamente emergencias con formato `EMERGENCY:` en remarks
* **Procesamiento en tiempo real** - Procesa emergencias tan pronto como se detectan en nuevos bloques
* **Filtrado inteligente** - Filtra solo emergencias válidas con el formato correcto
* **Protección contra duplicados** - Evita procesar la misma emergencia múltiples veces
* **Funciona en segundo plano** - Continúa escuchando incluso cuando la pestaña está oculta

### 📡 Monitor de Blockchain

* **Vista de radio** - Interfaz tipo radio que muestra todos los eventos de blockchain
* **Filtros** - Filtra por tipo de evento (todos, System.Remarked, emergencias)
* **Información detallada** - Muestra detalles completos de cada evento detectado
* **Modal de emergencias** - Vista detallada de emergencias con todos los datos
* **Mapas integrados** - Visualización de ubicación de emergencias en mapas interactivos

### 🔐 Seguridad y Privacidad

* **Wallet no custodial** - Tus claves privadas nunca salen de tu dispositivo
* **Encriptación local** - Todos los datos se almacenan encriptados en IndexedDB
* **Sin backend requerido** - Funciona completamente sin servidor central
* **Blockchain como fuente de verdad** - Todas las emergencias se verifican en blockchain

### 📱 Experiencia de Usuario

* **Mobile-first** - Diseñado para usar en dispositivos móviles
* **Instalable** - Instala como app nativa en tu dispositivo
* **Notificaciones** - Alertas cuando se detectan nuevas emergencias
* **Offline-first** - Funciona offline con sincronización automática
* **UI intuitiva** - Interfaz simple y clara enfocada en emergencias

## 🏗️ Arquitectura

### Componentes Principales

#### Servicios de Blockchain

**`src/services/blockchain/RemarkListenerPolkadot.ts`**
- Servicio principal que escucha eventos de blockchain usando `@polkadot/api`
- Suscribe a nuevos bloques y procesa eventos `System.Remarked`
- Extrae contenido de remarks desde extrinsics `system.remark` y `system.remarkWithEvent`
- Procesa emergencias y las guarda en IndexedDB
- Consulta identidad de reportantes en People Chains
- Protección contra duplicados a nivel de evento y almacenamiento

**Funciones principales:**
- `start(endpoint)`: Inicia la escucha de eventos
- `stop()`: Detiene la escucha
- `handleEvents()`: Procesa eventos de un bloque
- `extractRemarkContentFromBlock()`: Extrae contenido de remarks
- `processRemarkEvent()`: Procesa un evento de remark
- `processEmergency()`: Guarda emergencia en IndexedDB

#### Hooks

**`src/hooks/useRemarkListener.ts`**
- Hook React que gestiona el ciclo de vida del `RemarkListenerPolkadot`
- Maneja reconexión automática
- Gestiona estado de UI (listening, eventos, contadores)
- Integra notificaciones del navegador
- Maneja visibilidad de página (Page Visibility API)

**Funciones principales:**
- `startListener()`: Inicia el listener
- `stopListener()`: Detiene el listener
- `handleEmergencyReceived()`: Callback cuando se recibe una emergencia
- `handleBlockProcessed()`: Callback cuando se procesa un bloque

#### Componentes UI

**`src/components/BlockchainRadioMonitor.tsx`**
- Componente principal que muestra el monitor de radio blockchain
- Muestra todos los eventos detectados en tiempo real
- Filtros por tipo de evento
- Modal para ver detalles de emergencias
- Botón para activar/desactivar el servicio de escucha
- Botón para solicitar permisos de notificaciones
- Integración con mapas para visualizar emergencias

**`src/components/emergencies/EmergencyMap.tsx`**
- Componente de mapa interactivo usando Leaflet
- Muestra ubicación de emergencias
- Si hay log relacionado, muestra la ruta completa
- Marcadores personalizados (rojo para emergencia, verde para inicio de ruta)

#### Utilidades

**`src/utils/identityUtils.ts`**
- Consulta identidad de cuentas en múltiples People Chains
- Soporta Polkadot, Kusama y Paseo People Chains
- Retorna información de identidad on-chain (display, legal, web, etc.)

**`src/utils/emergencyStorage.ts`**
- Gestión de almacenamiento de emergencias en IndexedDB
- Funciones para guardar, obtener y buscar emergencias
- `getEmergencyByBlockchainRef()`: Verifica duplicados por referencia blockchain

**`src/types/emergencies.ts`**
- Tipos TypeScript para emergencias
- `EmergencyRemarkData`: Formato de datos en remarks
- `Emergency`: Estructura completa de emergencia
- `parseEmergencyFromRemark()`: Parsea JSON de emergencia desde remark

### Flujo de Detección

1. **Suscripción a bloques**: `RemarkListenerPolkadot` se suscribe a nuevos bloques usando `api.rpc.chain.subscribeNewHeads`
2. **Obtención de eventos**: Para cada nuevo bloque, obtiene eventos usando `api.query.system.events.at(blockHash)`
3. **Filtrado de eventos**: Busca eventos `System.Remarked` en los eventos del bloque
4. **Extracción de contenido**: Para cada `System.Remarked`, extrae el contenido del remark desde la extrinsic correspondiente
5. **Validación**: Verifica que el contenido comience con `EMERGENCY:`
6. **Parsing**: Parsea el JSON de emergencia desde el remark
7. **Verificación de duplicados**: Verifica si la emergencia ya fue procesada
8. **Guardado**: Guarda la emergencia en IndexedDB
9. **Notificación**: Notifica al usuario y actualiza la UI
10. **Consulta de identidad**: Consulta identidad del reportante en People Chains (en segundo plano)

## 📦 Instalación

Este proyecto usa **Yarn** como gestor de paquetes (corepack yarn para paquetes Kilt):

```bash
# Instalar dependencias
yarn install
```

## 🛠️ Desarrollo

```bash
# Iniciar servidor de desarrollo
yarn dev

# El servidor estará disponible en:
# - Local: http://localhost:9110/
# - Red: http://[tu-ip]:9110/
```

## 🏗️ Build

```bash
# Construir para producción
yarn build

# Vista previa de la build de producción
yarn preview
```

## 🌐 Redes Blockchain Soportadas

### Redes Principales

* **Polkadot** - Red principal de Polkadot
* **Kusama** - Canary network de Polkadot
* **Paseo** - Testnet de Polkadot

### Parachains

* **Asset Hub** - Gestión de assets (usado para enviar emergencias)
* **People Chain** - Identidad on-chain (usado para consultar identidad de reportantes)

## 📁 Estructura de Archivos Principales

```
emergency-wallet-pwa/
├── src/
│   ├── services/
│   │   └── blockchain/
│   │       └── RemarkListenerPolkadot.ts    # Servicio principal de escucha
│   ├── hooks/
│   │   └── useRemarkListener.ts             # Hook React para el listener
│   ├── components/
│   │   ├── BlockchainRadioMonitor.tsx       # Monitor principal de radio
│   │   └── emergencies/
│   │       └── EmergencyMap.tsx            # Mapa de emergencias
│   ├── utils/
│   │   ├── identityUtils.ts                 # Consulta de identidad
│   │   ├── emergencyStorage.ts              # Almacenamiento de emergencias
│   │   └── balance.ts                       # Utilidades de balance
│   ├── types/
│   │   └── emergencies.ts                   # Tipos de emergencias
│   └── pages/
│       ├── Home.tsx                         # Página principal con radio
│       └── EmergencyDetail.tsx             # Detalle de emergencia
├── public/
│   ├── site.webmanifest                     # Manifest de PWA
│   ├── web-app-manifest-*.png              # Iconos de PWA
│   └── apple-touch-icon.png                # Icono para iOS
├── vite.config.ts                           # Configuración de Vite y PWA
└── package.json                             # Dependencias del proyecto
```

## 🔧 Funcionalidades Técnicas

### Gestión de Emergencias

* Detección automática de emergencias en blockchain
* Almacenamiento local en IndexedDB
* Consulta de identidad de reportantes
* Visualización en mapas interactivos
* Notificaciones del navegador

### Seguridad

* **Encriptación local** - Todos los datos se almacenan encriptados
* **Sin backend** - Funciona completamente sin servidor central
* **Blockchain como fuente de verdad** - Verificación en blockchain

## 📚 Documentación

La documentación completa está disponible en la carpeta `docs/`:

* **[Plan PWA Emergencias](./docs/PLAN_PWA_EMERGENCIAS_MINIMA.md)** - Plan para versión mínima de emergencias

## 🛡️ Seguridad

### ⚠️ Advertencia Importante

Emergency Wallet es una aplicación **no custodial**. Esto significa:

* **Tú eres el único responsable** de tus claves privadas y fondos
* **Guarda tu frase de recuperación** en un lugar seguro
* **Nunca compartas** tu frase de recuperación con nadie
* **Si pierdes tu frase de recuperación**, perderás acceso permanente a tus fondos
* **No hay forma de recuperar** tu cuenta sin la frase de recuperación

### Mejores Prácticas

1. **Backup regular** - Exporta tu wallet regularmente
2. **Contraseña segura** - Usa una contraseña fuerte y única
3. **Verifica direcciones** - Siempre verifica las direcciones antes de enviar
4. **Mantén actualizado** - Mantén la aplicación actualizada

## 🏗️ Stack Tecnológico

* **Vite 7** - Build tool ultra rápido
* **React 18** - Framework UI
* **TypeScript** - Tipado estático completo
* **Tailwind CSS 4** - Framework CSS moderno
* **shadcn/ui** - Componentes UI accesibles
* **@polkadot/api** - API de Polkadot para escuchar eventos
* **Dedot** - Cliente JavaScript para Polkadot (otras funciones)
* **Polkadot.js Keyring** - Gestión de cuentas criptográficas
* **IndexedDB** - Almacenamiento local
* **Leaflet** - Mapas interactivos
* **Workbox** - Service Worker para capacidades offline

## 🎯 Roadmap

### Próximas Características

* [ ] Notificaciones push completas (requiere servidor)
* [ ] Estadísticas de emergencias
* [ ] Filtros avanzados en el monitor
* [ ] Exportación de datos de emergencias
* [ ] Integración con servicios de emergencia externos

## 📝 Licencia

MIT

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para cualquier mejora o corrección.

## 📧 Contacto

Para preguntas o soporte, por favor abre un issue en el repositorio.

---

**Emergency Wallet** - Tu radio blockchain para emergencias 🚨📡
