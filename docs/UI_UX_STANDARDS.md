# Estándares de UI/UX - Emergency Wallet

**Fecha de creación**: 2026-01-21  
**Versión**: 1.0  
**Objetivo**: Estandarizar el diseño y experiencia de usuario para todas las PWAs basadas en Emergency Wallet

---

## 📋 Tabla de Contenidos

1. [Principios Fundamentales](#principios-fundamentales)
2. [Sistema de Diseño](#sistema-de-diseño)
3. [Layout y Estructura](#layout-y-estructura)
4. [Componentes y Patrones](#componentes-y-patrones)
5. [Responsive Design](#responsive-design)
6. [Regla de Clicks y Accesibilidad](#regla-de-clicks-y-accesibilidad)
7. [Elementos en Pantalla](#elementos-en-pantalla)
8. [Tema Oscuro/Claro](#tema-oscuroclaro)
9. [Mejores Prácticas](#mejores-prácticas)

---

## 🎯 Principios Fundamentales

### 1. Mobile-First, Desktop-Responsive
- **Prioridad**: Diseño pensado primero para móviles
- **Desktop**: Adaptación fluida sin perder funcionalidad
- **Breakpoints**: `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`

### 2. Accesibilidad por Distancia
- **Móvil**: Componentes principales a **un dedo de distancia** (zona de pulgar)
- **Desktop**: Componentes principales a **una mano de distancia** (zona de mouse)
- **Touch targets**: Mínimo 44x44px en móvil

### 3. Regla de los 3 Clicks
- **Acciones principales**: Máximo 3 clicks/taps
- **Acciones críticas**: 1-2 clicks (crear emergencia, enviar transacción)
- **Acciones secundarias**: 2-3 clicks máximo

### 4. Claridad y Simplicidad
- **Máximo 5-7 elementos principales** por pantalla
- **Jerarquía visual clara**: Títulos, subtítulos, contenido
- **Información esencial visible**: Sin scroll innecesario para acciones críticas

### 5. Consistencia Visual
- **shadcn/ui como base**: Todos los componentes deben usar shadcn/ui
- **Colores semánticos**: Consistencia en toda la aplicación
- **Espaciado uniforme**: Sistema de espaciado consistente

---

## 🎨 Sistema de Diseño

### Colores

#### Light Mode
```css
/* Backgrounds */
--background: 217 91% 98%;        /* Azul muy claro con tinte */
--card: 217 91% 99%;              /* Card ligeramente más claro que background */
--muted: 217 91% 97%;             /* Muted con tinte azul */

/* Borders */
--border: 217 33% 85%;            /* Border visible pero suave */

/* Primary */
--primary: 217 91% 60%;           /* Azul vibrante */
--primary-foreground: 0 0% 100%;  /* Blanco */

/* Destructive (Emergencias) */
--destructive: 0 84% 60%;         /* Rojo para emergencias */
--destructive-foreground: 0 0% 100%;
```

#### Dark Mode
```css
/* Backgrounds */
--background: 222.2 47.4% 11.2%;  /* Azul muy oscuro */
--card: 217 33% 19%;              /* Card más claro que background */
--muted: 217 20% 25%;             /* Muted oscuro */

/* Borders */
--border: 217 30% 30%;            /* Border visible en dark mode */

/* Primary */
--primary: 217 91% 60%;           /* Mismo azul */
--primary-foreground: 0 0% 100%;

/* Destructive */
--destructive: 0 72% 51%;          /* Rojo más suave */
--destructive-foreground: 0 0% 100%;
```

### Tipografía

```css
/* Títulos */
h1: text-xl sm:text-2xl md:text-3xl font-bold
h2: text-lg sm:text-xl md:text-2xl font-semibold
h3: text-base sm:text-lg font-semibold

/* Cuerpo */
body: text-sm sm:text-base
small: text-xs sm:text-sm

/* Monospace (direcciones) */
code: text-xs sm:text-sm font-mono
```

### Espaciado

```css
/* Padding de Cards */
Mobile: p-4
Desktop: p-6

/* Gap entre elementos */
Mobile: gap-2 sm:gap-4
Desktop: gap-4 sm:gap-6

/* Espaciado de secciones */
Mobile: space-y-4 sm:space-y-6
Desktop: space-y-6
```

### Sombras y Profundidad

```css
/* Cards estándar */
box-shadow: 
  0 1px 3px 0 rgba(0, 0, 0, 0.1),
  0 1px 2px -1px rgba(0, 0, 0, 0.08),
  0 4px 6px -1px rgba(0, 0, 0, 0.06),
  0 2px 4px -2px rgba(0, 0, 0, 0.04);

/* Cards en hover */
box-shadow: 
  0 4px 6px -1px rgba(0, 0, 0, 0.12),
  0 2px 4px -2px rgba(0, 0, 0, 0.1),
  0 10px 15px -3px rgba(0, 0, 0, 0.08),
  0 4px 8px -4px rgba(0, 0, 0, 0.06);

/* Dark mode - sombras más pronunciadas */
box-shadow: 
  0 1px 3px 0 rgba(0, 0, 0, 0.4),
  0 1px 2px -1px rgba(0, 0, 0, 0.3),
  0 4px 6px -1px rgba(0, 0, 0, 0.3),
  0 2px 4px -2px rgba(0, 0, 0, 0.2);
```

---

## 📐 Layout y Estructura

### Header

#### Mobile (< 768px)
```tsx
<header className="glass-header border-b sticky top-0 z-40">
  <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
    <div className="flex items-center justify-between gap-2">
      {/* Logo - Solo icono */}
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10">
        <img src="/web-app-manifest-192x192.png" alt="Logo" />
      </div>
      
      {/* Acciones - Solo esenciales */}
      <div className="flex items-center gap-1 sm:gap-2">
        <BalanceDisplay className="hidden sm:flex" />
        <ThemeToggle className="hidden sm:flex" />
        <LogoutButton />
      </div>
    </div>
  </div>
</header>
```

**Reglas**:
- **Altura**: Mínima (solo esencial)
- **Contenido**: Logo (icono), balance (desktop), theme toggle (desktop), logout
- **Posición**: Top, sticky, z-40
- **Logo**: Solo icono de la PWA, sin texto

#### Desktop (≥ 768px)
```tsx
<header className="glass-header border-b sticky top-0 z-40">
  <div className="container mx-auto px-4 py-4">
    <div className="flex items-center justify-between gap-4">
      {/* Logo */}
      <div className="h-10 w-10 rounded-full bg-primary/10">
        <img src="/web-app-manifest-192x192.png" alt="Logo" />
      </div>
      
      {/* Network Switcher */}
      <NetworkSwitcher />
      
      {/* Acciones */}
      <div className="flex items-center gap-2">
        <BalanceDisplay />
        <ActiveAccountSwitcher />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </div>
  </div>
</header>
```

**Reglas**:
- **Altura**: 64px
- **Contenido**: Logo, NetworkSwitcher, BalanceDisplay, ActiveAccountSwitcher, ThemeToggle, LogoutButton
- **Posición**: Top, sticky, z-40

### FABs (Floating Action Buttons)

#### Posicionamiento
```tsx
/* FAB de Emergencia - Izquierda (para usuarios diestros) */
<FAB
  position="left"
  variant="destructive"
  icon={AlertTriangle}
  label="Crear Emergencia"
  onClick={handleEmergency}
/>

/* FAB de Navegación - Derecha */
<FAB
  position="right"
  variant="default"
  icon={Menu}
  label="Navegación"
  onClick={handleNavigation}
/>
```

**Reglas**:
- **Tamaño**: 56px (móvil), 64px (tablet/desktop)
- **Posición**: 
  - Emergencia: `bottom-4 left-4` (zona óptima para pulgar izquierdo)
  - Navegación: `bottom-4 right-4` (zona óptima para pulgar derecho)
- **Z-index**: z-[100]
- **Safe area**: Respetar `env(safe-area-inset-bottom)`
- **Estado dim**: Opacidad 0.4 cuando la tabla está expandida, vuelve a 1.0 en hover

#### Estilos CSS
```css
.fab-emergency button {
  background-color: hsl(var(--destructive)) !important;
  color: hsl(var(--destructive-foreground)) !important;
  border: 2px solid hsl(var(--destructive) / 0.4) !important;
}

.fab-navigation button {
  background-color: hsl(var(--primary)) !important;
  color: hsl(var(--primary-foreground)) !important;
  border: 2px solid hsl(var(--primary) / 0.4) !important;
}

.fab-dim-active {
  opacity: 0.4;
}

.fab-dim-active:hover,
.fab-dim-active:focus-within {
  opacity: 1;
  transform: scale(1.05);
}
```

### Bottom Navigation (Mobile)

```tsx
<Sheet>
  <SheetTrigger asChild>
    <FAB position="right" icon={Menu} />
  </SheetTrigger>
  <SheetContent
    side="bottom-above-fab"
    className="h-[70vh] rounded-t-2xl sheet-solid-bg"
    style={{ bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 1rem)) + 5rem)' }}
  >
    {/* Contenido de navegación */}
  </SheetContent>
</Sheet>
```

**Reglas**:
- **Altura**: 70vh máximo
- **Posición**: Encima de los FABs
- **Background**: Sólido (no translúcido)
- **Contenido**: BalanceDisplay, navegación, acciones rápidas

### Cards

```tsx
<Card className="rounded-xl border bg-card text-card-foreground shadow-sm">
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenido */}
  </CardContent>
</Card>
```

**Reglas**:
- **Background**: Color con tinte azul suave (no blanco puro)
- **Border**: Visible pero suave
- **Sombra**: Múltiples capas para profundidad
- **Hover**: Sombra más pronunciada, transformación sutil
- **Padding**: p-4 (móvil), p-6 (desktop)

---

## 🧩 Componentes y Patrones

### Botones

#### Tamaños Responsivos
```tsx
/* Mobile */
<Button size="sm" className="w-full sm:w-auto min-h-[44px]">
  Acción
</Button>

/* Desktop */
<Button size="sm" className="w-auto">
  Acción
</Button>
```

**Reglas**:
- **Mobile**: `w-full` en formularios, `min-h-[44px]` para touch
- **Desktop**: `w-auto` para botones individuales
- **Tamaños**: `sm` para acciones secundarias, `lg` para acciones principales

### Formularios

```tsx
<div className="flex flex-col sm:flex-row gap-2">
  <Button variant="destructive" size="sm" className="w-full sm:flex-1">
    Crear
  </Button>
  <Button variant="outline" size="sm" className="w-full sm:flex-1">
    Cancelar
  </Button>
</div>
```

**Reglas**:
- **Layout**: Vertical en móvil, horizontal en desktop
- **Ancho**: `w-full` en móvil, `flex-1` o `w-auto` en desktop
- **Gap**: `gap-2` entre botones

### Listas de Items

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg">
  <div className="flex items-center gap-4 flex-1 min-w-0">
    {/* Avatar/Icono */}
    <Avatar className="h-10 w-10 flex-shrink-0" />
    
    {/* Información */}
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold truncate">Título</h3>
      <code className="text-xs sm:text-sm font-mono break-all">
        Dirección o texto largo
      </code>
    </div>
  </div>
  
  {/* Acciones */}
  <div className="flex gap-2 flex-shrink-0 sm:self-center">
    <Button size="sm" className="w-full sm:w-auto">
      Acción
    </Button>
  </div>
</div>
```

**Reglas**:
- **Layout**: Vertical en móvil, horizontal en desktop
- **Información**: `flex-1 min-w-0` para permitir truncado
- **Acciones**: `flex-shrink-0` para evitar compresión

---

## 📱 Responsive Design

### Breakpoints

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

### Patrones Responsivos

#### Títulos
```tsx
<h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
  Título
</h1>
```

#### Espaciado
```tsx
<div className="space-y-4 sm:space-y-6">
  {/* Contenido */}
</div>
```

#### Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
  {/* Items */}
</div>
```

#### Padding
```tsx
<div className="p-4 sm:p-6">
  {/* Contenido */}
</div>
```

---

## 🎯 Regla de Clicks y Accesibilidad

### Matriz de Accesibilidad

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

### Flujos Optimizados

#### Acciones Críticas (1-2 Clicks)
1. **Crear Emergencia**: FAB → Formulario (1 click)
2. **Ver Emergencia**: Card click → Detalle (1 click)
3. **Cambiar Cuenta**: Header → Selector (1-2 clicks)

#### Acciones Frecuentes (2-3 Clicks)
1. **Enviar Transacción**: BottomNav → Send → Formulario (2 clicks)
2. **Ver Transacciones**: BottomNav → Transactions (2 clicks)
3. **Configuración**: BottomNav → Settings (2 clicks)

---

## 📊 Elementos en Pantalla

### Regla de los 5-7 Elementos

**Máximo 5-7 elementos principales** por pantalla para evitar sobrecarga cognitiva.

#### Home Screen
1. Header (logo, balance, cuenta)
2. Blockchain Radio Monitor
3. Emergencias Activas (card)
4. FAB de Emergencia
5. FAB de Navegación

#### Página de Lista (Ej: Accounts)
1. Header
2. Título y descripción
3. Botones de acción (Crear, Importar)
4. Lista de items (cards)
5. FABs (si aplica)

#### Página de Detalle
1. Header con botón "Volver"
2. Título y descripción
3. Card principal con información
4. Cards secundarias (balances, acciones)
5. Botones de acción

### Densidad de Información

```tsx
/* ✅ Correcto - Información clara y espaciada */
<Card className="space-y-4">
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descripción breve</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Máximo 3-4 elementos por card */}
  </CardContent>
</Card>

/* ❌ Incorrecto - Demasiada información */
<Card className="space-y-1">
  {/* Demasiados elementos pequeños */}
</Card>
```

---

## 🌓 Tema Oscuro/Claro

### Configuración

```tsx
// ThemeContext.tsx
const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

useEffect(() => {
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}, [theme])
```

### Toggle de Tema

```tsx
<ThemeToggle className="hidden sm:flex" />
```

**Ubicación**:
- **Mobile**: En el sheet de navegación (BottomNav)
- **Desktop**: En el header

### Colores Adaptativos

```css
/* Light Mode */
:root {
  --card: 217 91% 99%;
  --background: 217 91% 98%;
  --border: 217 33% 85%;
}

/* Dark Mode */
.dark {
  --card: 217 33% 19%;
  --background: 222.2 47.4% 11.2%;
  --border: 217 30% 30%;
}
```

**Reglas**:
- **Cards**: Siempre más claras que el background para contraste
- **Borders**: Visibles en ambos modos
- **Sombras**: Más pronunciadas en dark mode

---

## ✅ Mejores Prácticas

### 1. Uso de shadcn/ui

```tsx
/* ✅ Correcto */
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

/* ❌ Incorrecto */
<button className="custom-button">Acción</button>
```

### 2. Responsive First

```tsx
/* ✅ Correcto - Mobile first */
<div className="flex flex-col sm:flex-row gap-2">
  <Button className="w-full sm:w-auto">Acción</Button>
</div>

/* ❌ Incorrecto - Desktop first */
<div className="flex-row flex-col">
  <Button>Acción</Button>
</div>
```

### 3. Touch Targets

```tsx
/* ✅ Correcto - Mínimo 44px */
<Button size="sm" className="min-h-[44px]">
  Acción
</Button>

/* ❌ Incorrecto - Muy pequeño */
<Button size="sm" className="h-6">
  Acción
</Button>
```

### 4. Estados de Carga

```tsx
<Button disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Cargando...
    </>
  ) : (
    'Acción'
  )}
</Button>
```

### 5. Validación de Formularios

```tsx
{error && (
  <Alert variant="destructive">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

### 6. Navegación

```tsx
/* ✅ Correcto - Link con Button */
<Button asChild>
  <Link to="/accounts/create">
    Crear Cuenta
  </Link>
</Button>

/* ❌ Incorrecto - onClick con navigate */
<Button onClick={() => navigate('/accounts/create')}>
  Crear Cuenta
</Button>
```

### 7. Información Colapsable

```tsx
/* Alert fuera de la card con botón de info */
<div className="fixed top-4 right-4 z-10">
  <Button
    variant="outline"
    size="icon"
    onClick={() => setShowInfo(!showInfo)}
  >
    {showInfo ? <X /> : <Info />}
  </Button>
</div>

{showInfo && (
  <div className="fixed top-16 right-4 left-4 sm:max-w-md z-10">
    <Alert>
      <AlertDescription>
        Información importante
      </AlertDescription>
    </Alert>
  </div>
)}
```

---

## 📋 Checklist de Implementación

### Layout
- [ ] Header con logo (solo icono)
- [ ] FABs posicionados correctamente (emergencia izquierda, navegación derecha)
- [ ] BottomNav con sheet sólido (no translúcido)
- [ ] Safe area insets respetados

### Responsive
- [ ] Títulos con tamaños responsivos
- [ ] Botones con layout vertical en móvil, horizontal en desktop
- [ ] Cards con padding responsivo
- [ ] Grid adaptativo (1-2-3 columnas)

### Accesibilidad
- [ ] Touch targets mínimo 44x44px
- [ ] Acciones principales ≤ 3 clicks
- [ ] Acciones críticas ≤ 2 clicks
- [ ] Máximo 5-7 elementos principales por pantalla

### Tema
- [ ] Toggle de tema en header (desktop) y BottomNav (móvil)
- [ ] Colores adaptativos para light/dark mode
- [ ] Cards con contraste adecuado en ambos modos

### Componentes
- [ ] Todos los componentes usan shadcn/ui
- [ ] Estados de carga implementados
- [ ] Validación de formularios visible
- [ ] Información colapsable con botón de info

---

## 🚀 Ejemplos de Implementación

### Página de Lista (Accounts)
```tsx
export default function Accounts() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con título y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Cuentas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Descripción
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" className="w-full sm:w-auto">
            Acción
          </Button>
        </div>
      </div>

      {/* Lista de items */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            {/* Items */}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### Página de Detalle
```tsx
export default function Detail() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con botón volver */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/back">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
              Título
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Descripción
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" className="w-full sm:w-auto">
            Acción Principal
          </Button>
        </div>
      </div>

      {/* Cards de información */}
      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Contenido */}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 📚 Referencias

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [MOBILE_FIRST_UX_PRINCIPLES.md](./MOBILE_FIRST_UX_PRINCIPLES.md)
- [SHADCN_UI_STANDARD.md](./SHADCN_UI_STANDARD.md)
- [UI_BRANDING_SUGGESTIONS.md](./UI_BRANDING_SUGGESTIONS.md)

---

**Última actualización**: 2026-01-21  
**Mantenido por**: Equipo de Desarrollo Emergency Wallet
