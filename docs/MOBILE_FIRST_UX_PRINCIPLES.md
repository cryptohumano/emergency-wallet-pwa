# Principios UX/UI Mobile-First - Emergency Wallet

**Fecha**: 2026-01-21  
**Branch**: `feature/ui-improvements`  
**Objetivo**: Optimizar la PWA para móviles principalmente, manteniendo excelente experiencia en desktop

## 🎯 Principios Fundamentales

### 1. Mobile-First, Desktop-Responsive
- **Prioridad**: Diseño pensado primero para móviles
- **Desktop**: Adaptación fluida sin perder funcionalidad
- **Responsive**: Breakpoints claros y consistentes

### 2. Accesibilidad por Distancia
- **Móvil**: Componentes principales a **un dedo de distancia** (zona de pulgar)
- **Desktop**: Componentes principales a **una mano de distancia** (zona de mouse)
- **Áreas de alcance**: Optimizar posicionamiento según dispositivo

### 3. Regla de los 3 Clicks
- **Toda acción principal**: Máximo 3 clicks/taps
- **Acciones críticas**: 1-2 clicks (crear emergencia, enviar transacción)
- **Acciones secundarias**: 2-3 clicks máximo

---

## 📱 Zonas de Alcance (Mobile)

### Zona de Pulgar (Thumb Zone)
```
┌─────────────────────────┐
│  ⚠️  Difícil            │
│  ⚠️  Difícil            │
│  ✅  Fácil              │
│  ✅  Fácil              │
│  ✅  Fácil              │
│  ✅  Fácil              │
│  ✅  Óptimo (FAB)       │
└─────────────────────────┘
```

**Reglas**:
- **Zona Óptima**: Bottom-right (FAB para acciones principales)
- **Zona Fácil**: Bottom 1/3 de la pantalla
- **Zona Difícil**: Top 1/3 de la pantalla (evitar acciones frecuentes)

### Componentes en Zona Óptima
1. **FAB (Floating Action Button)**: Acciones principales
   - Crear emergencia
   - Enviar transacción
   - Acción más frecuente de la página

2. **Bottom Navigation**: Navegación principal
   - Siempre visible
   - Safe area insets respetados
   - Mínimo 4 opciones, máximo 5

---

## 🖥️ Zonas de Alcance (Desktop)

### Zona de Mouse
```
┌─────────────────────────────────┐
│  ✅  Fácil (Header)             │
│                                 │
│  ✅  Fácil  │  ✅  Fácil       │
│  (Sidebar)  │  (Content)       │
│             │                   │
│             │                   │
│             │  ✅  Fácil        │
└─────────────────────────────────┘
```

**Reglas**:
- **Header**: Acciones globales (cuenta, red, logout)
- **Sidebar**: Navegación principal (siempre visible)
- **Content**: Área de trabajo principal
- **Bottom**: Evitar acciones críticas (lejos del mouse)

---

## 🎯 Acciones Principales y Flujos

### Acciones Críticas (1-2 Clicks)

#### 1. Crear Emergencia
**Objetivo**: 1 click desde Home

**Flujo Actual**:
1. Home → Botón "Crear Emergencia" (1 click) ✅

**Optimización**:
- ✅ Mantener botón grande y visible en Home
- ✅ Agregar FAB en Home para acceso rápido
- ✅ Shortcut: Swipe up desde bottom nav

#### 2. Ver Emergencias Activas
**Objetivo**: 1 click desde Home

**Flujo Actual**:
1. Home → Click en emergencia (1 click) ✅

**Optimización**:
- ✅ Cards clickeables grandes
- ✅ Swipe para acciones rápidas

#### 3. Cambiar Cuenta Activa
**Objetivo**: 1-2 clicks desde cualquier página

**Flujo Actual**:
1. Header → ActiveAccountSwitcher (1 click) ✅

**Optimización**:
- ✅ Mantener en header (siempre visible)
- ✅ Agregar en BottomNav (móvil)

### Acciones Frecuentes (2-3 Clicks)

#### 4. Enviar Transacción
**Objetivo**: 2-3 clicks desde Home

**Flujo Actual**:
1. Home → Accesos Rápidos → "Enviar" (2 clicks) ✅

**Optimización**:
- ✅ Agregar a BottomNav (si se usa frecuentemente)
- ✅ Mantener en accesos rápidos

#### 5. Ver Detalle de Emergencia
**Objetivo**: 1 click desde lista

**Flujo Actual**:
1. Emergencias → Click en card (1 click) ✅

**Optimización**:
- ✅ Cards grandes y clickeables
- ✅ Preview en hover (desktop)

#### 6. Ver Transacciones
**Objetivo**: 2 clicks desde Home

**Flujo Actual**:
1. Home → BottomNav → "Transacciones" (2 clicks) ✅

**Optimización**:
- ✅ Mantener en BottomNav
- ✅ Agregar acceso rápido en Home

---

## 📐 Componentes y Posicionamiento

### Mobile (< 768px)

#### Header
- **Altura**: Mínima (solo esencial)
- **Contenido**: Logo, cuenta activa, logout
- **Posición**: Top, sticky, z-40

#### Bottom Navigation
- **Altura**: 56px + safe area
- **Contenido**: 4-5 opciones principales
- **Posición**: Bottom, fixed, z-100
- **Safe Area**: Respetar insets

#### FAB (Floating Action Button)
- **Tamaño**: 56px (móvil), 64px (tablet)
- **Posición**: Bottom-right
- **Offset**: 16px desde bordes + safe area
- **Z-index**: z-[100]
- **Uso**: Acción principal de la página

#### Contenido Principal
- **Padding**: 16px (móvil), 24px (tablet)
- **Padding Bottom**: 80px (para BottomNav + FAB)
- **Scroll**: Smooth, con momentum

### Desktop (> 768px)

#### Header
- **Altura**: 64px
- **Contenido**: Logo, navegación, cuenta, red, logout
- **Posición**: Top, sticky, z-40

#### Sidebar
- **Ancho**: 256px (fijo)
- **Contenido**: Navegación completa
- **Posición**: Left, fixed, z-30
- **Scroll**: Independiente si es necesario

#### Contenido Principal
- **Margin Left**: 256px (con sidebar)
- **Padding**: 32px
- **Max Width**: 1280px (centrado)

---

## 🎨 Componentes shadcn/ui Optimizados para Mobile

### Button
```tsx
// Mobile: Tamaños grandes, fácil de tocar
<Button size="lg" className="h-12 min-h-[44px]"> // Mínimo 44px para touch
  Acción
</Button>

// Desktop: Tamaños estándar
<Button size="default" className="h-10">
  Acción
</Button>
```

### Card
```tsx
// Mobile: Padding generoso, clickeable
<Card className="p-4 active:scale-[0.98] transition-transform">
  {/* Contenido */}
</Card>

// Desktop: Hover states
<Card className="p-6 hover:shadow-lg transition-shadow">
  {/* Contenido */}
</Card>
```

### Input
```tsx
// Mobile: Tamaño grande, evitar zoom
<Input 
  className="h-12 text-base" // Evita zoom en iOS
  inputMode="numeric" // Teclado apropiado
/>
```

### Sheet (Bottom Sheet)
```tsx
// Mobile: Desde abajo, altura 70-90vh
<Sheet>
  <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
    {/* Contenido */}
  </SheetContent>
</Sheet>
```

---

## 📊 Matriz de Accesibilidad

| Acción | Móvil | Desktop | Clicks | Prioridad |
|--------|-------|---------|--------|-----------|
| Crear Emergencia | FAB | Button Header | 1 | 🔴 Crítica |
| Ver Emergencias | BottomNav | Sidebar | 1 | 🔴 Crítica |
| Detalle Emergencia | Card Click | Card Click | 1 | 🔴 Crítica |
| Cambiar Cuenta | Header/BottomNav | Header | 1-2 | 🟡 Alta |
| Enviar Transacción | BottomNav | Sidebar | 2 | 🟡 Alta |
| Ver Transacciones | BottomNav | Sidebar | 2 | 🟡 Alta |
| Configuración | BottomNav | Sidebar | 2 | 🟢 Media |
| Ver Cuentas | BottomNav | Sidebar | 2 | 🟢 Media |

---

## ✅ Checklist de Implementación

### Mobile-First
- [ ] FAB para acción principal en cada página
- [ ] BottomNav con 4-5 opciones principales
- [ ] Botones mínimo 44px de altura (touch target)
- [ ] Safe area insets respetados
- [ ] Inputs con tamaño adecuado (evitar zoom iOS)
- [ ] Cards grandes y clickeables
- [ ] Swipe gestures donde sea apropiado

### Desktop-Responsive
- [ ] Sidebar siempre visible
- [ ] Header con todas las acciones globales
- [ ] Hover states en elementos interactivos
- [ ] Grid responsive (1-2-3 columnas según breakpoint)
- [ ] Modales centrados (no fullscreen)

### Regla de 3 Clicks
- [ ] Todas las acciones principales auditadas
- [ ] Flujos optimizados a máximo 3 clicks
- [ ] Acciones críticas a 1-2 clicks
- [ ] Breadcrumbs para navegación profunda

### Componentes shadcn/ui
- [ ] Todos los componentes usan shadcn/ui
- [ ] Variantes mobile/desktop donde sea necesario
- [ ] Consistencia visual en toda la app

---

## 🚀 Mejoras Propuestas

### 1. BottomNav Mejorado
- [ ] Migrar `<button>` nativo a `Button` de shadcn/ui
- [ ] Agregar indicadores de notificaciones
- [ ] Agregar badge con contador de emergencias activas
- [ ] Mejorar animaciones y feedback táctil

### 2. FAB Global
- [ ] Crear componente `FAB` reutilizable
- [ ] Posicionar en zona óptima (bottom-right)
- [ ] Cambiar acción según página actual
- [ ] Animación suave al cambiar

### 3. Accesos Rápidos
- [ ] Agregar swipe gestures
- [ ] Agregar shortcuts de teclado (desktop)
- [ ] Agregar comandos rápidos (Cmd+K)

### 4. Optimización de Cards
- [ ] Hacer todas las cards clickeables
- [ ] Agregar feedback visual (ripple effect)
- [ ] Agregar preview en hover (desktop)

---

## 📱 Breakpoints

```css
/* Mobile First */
/* Base: < 640px */

/* Tablet */
@media (min-width: 640px) { /* sm */ }

/* Desktop */
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

---

## 🎯 Métricas de Éxito

### Mobile
- ✅ FAB visible y accesible en < 1 segundo
- ✅ BottomNav siempre visible
- ✅ Touch targets mínimo 44x44px
- ✅ Safe area insets respetados
- ✅ No zoom automático en inputs

### Desktop
- ✅ Sidebar siempre visible
- ✅ Header con todas las acciones
- ✅ Hover states funcionando
- ✅ Navegación por teclado funcional

### General
- ✅ Todas las acciones principales ≤ 3 clicks
- ✅ Acciones críticas ≤ 2 clicks
- ✅ Consistencia visual en toda la app
- ✅ Componentes shadcn/ui usados correctamente

---

**Última actualización**: 2026-01-21  
**Próxima revisión**: Después de implementaciones
