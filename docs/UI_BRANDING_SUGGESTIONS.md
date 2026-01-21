# Sugerencias de UI, Branding y Diseño - Emergency Wallet

**Fecha**: 2026-01-21  
**Branch**: `feature/ui-improvements`  
**Objetivo**: Proponer sistema de diseño coherente, profesional y optimizado para emergencias

---

## 🎨 Concepto de Branding

### Identidad de Marca
**Emergency Wallet** debe transmitir:
- ✅ **Confiabilidad**: Seguridad y estabilidad
- ✅ **Urgencia Controlada**: Importante pero no alarmante
- ✅ **Profesionalismo**: Serio y confiable
- ✅ **Claridad**: Fácil de usar en situaciones de estrés
- ✅ **Modernidad**: Tecnología blockchain de vanguardia

### Palabras Clave
- Confiable, Seguro, Rápido, Claro, Profesional, Moderno

---

## 🎨 Sistema de Colores Propuesto

### Opción 1: Azul Profesional (Recomendado) 🔵

**Filosofía**: Azul transmite confianza, seguridad y profesionalismo. Perfecto para una wallet de emergencias.

#### Light Mode
```css
--primary: 217 91% 60%;           /* Azul vibrante #3B82F6 */
--primary-foreground: 0 0% 100%;  /* Blanco */
--secondary: 217 33% 17%;         /* Azul oscuro para contraste */
--accent: 217 91% 95%;            /* Azul muy claro para fondos */
--destructive: 0 84% 60%;          /* Rojo para emergencias */
--success: 142 76% 36%;           /* Verde para estados positivos */
--warning: 38 92% 50%;             /* Amarillo/Naranja para advertencias */
--background: 0 0% 100%;           /* Blanco puro */
--foreground: 222 47% 11%;         /* Casi negro */
--muted: 210 40% 96%;              /* Gris muy claro */
```

#### Dark Mode
```css
--primary: 217 91% 60%;           /* Mismo azul */
--primary-foreground: 0 0% 100%;  /* Blanco */
--secondary: 217 33% 17%;         /* Azul oscuro */
--accent: 217 20% 25%;            /* Azul oscuro para fondos */
--destructive: 0 72% 51%;          /* Rojo más suave */
--success: 142 71% 45%;           /* Verde más suave */
--warning: 38 92% 50%;             /* Amarillo/Naranja */
--background: 222 47% 11%;         /* Azul muy oscuro */
--foreground: 210 40% 98%;         /* Casi blanco */
--muted: 217 33% 17%;              /* Azul oscuro */
```

**Ventajas**:
- ✅ Confianza y profesionalismo
- ✅ Excelente contraste
- ✅ Funciona bien en light y dark mode
- ✅ No cansa la vista

---

### Opción 2: Verde Esmeralda (Alternativa) 🟢

**Filosofía**: Verde transmite seguridad, naturaleza y calma. Útil para reducir ansiedad en emergencias.

#### Light Mode
```css
--primary: 142 76% 36%;           /* Verde esmeralda #10B981 */
--primary-foreground: 0 0% 100%;  /* Blanco */
--secondary: 142 33% 17%;         /* Verde oscuro */
--accent: 142 76% 95%;            /* Verde muy claro */
--destructive: 0 84% 60%;         /* Rojo para emergencias */
--success: 142 76% 36%;           /* Verde para estados positivos */
--warning: 38 92% 50%;            /* Amarillo/Naranja */
--background: 0 0% 100%;          /* Blanco */
--foreground: 142 47% 11%;        /* Casi negro con tinte verde */
```

**Ventajas**:
- ✅ Calma y seguridad
- ✅ Menos agresivo que el azul
- ✅ Asociado con "seguro" y "listo"

**Desventajas**:
- ⚠️ Puede ser menos distintivo
- ⚠️ Verde puede confundirse con "éxito" en lugar de "acción"

---

### Opción 3: Púrpura Moderno (Innovador) 🟣

**Filosofía**: Púrpura transmite innovación, tecnología y exclusividad. Único en el espacio blockchain.

#### Light Mode
```css
--primary: 262 83% 58%;           /* Púrpura vibrante #8B5CF6 */
--primary-foreground: 0 0% 100%;  /* Blanco */
--secondary: 262 33% 17%;         /* Púrpura oscuro */
--accent: 262 83% 95%;            /* Púrpura muy claro */
--destructive: 0 84% 60%;         /* Rojo para emergencias */
--success: 142 76% 36%;           /* Verde */
--warning: 38 92% 50%;            /* Amarillo/Naranja */
```

**Ventajas**:
- ✅ Único y distintivo
- ✅ Asociado con tecnología e innovación
- ✅ Moderno y premium

**Desventajas**:
- ⚠️ Menos tradicional para emergencias
- ⚠️ Puede no transmitir urgencia

---

## 🎨 Recomendación: Azul Profesional

**Razones**:
1. ✅ Confianza y profesionalismo (crítico para emergencias)
2. ✅ Excelente legibilidad y contraste
3. ✅ Funciona bien en todos los dispositivos
4. ✅ No cansa la vista en uso prolongado
5. ✅ Asociado con tecnología y seguridad

---

## 🌈 Paleta de Colores Semánticos

### Colores de Estado

#### Emergencias
```css
/* Crítica - Rojo intenso */
--emergency-critical: 0 84% 60%;      /* #EF4444 */
--emergency-critical-bg: 0 84% 96%;   /* Fondo muy claro */

/* Alta - Naranja */
--emergency-high: 25 95% 53%;        /* #F97316 */
--emergency-high-bg: 25 95% 96%;

/* Media - Amarillo */
--emergency-medium: 43 96% 56%;      /* #EAB308 */
--emergency-medium-bg: 43 96% 96%;

/* Baja - Azul */
--emergency-low: 217 91% 60%;        /* #3B82F6 */
--emergency-low-bg: 217 91% 96%;
```

#### Estados del Sistema
```css
/* Conectado - Verde */
--status-connected: 142 76% 36%;      /* #10B981 */
--status-connected-bg: 142 76% 96%;

/* Desconectado - Rojo */
--status-disconnected: 0 84% 60%;     /* #EF4444 */
--status-disconnected-bg: 0 84% 96%;

/* Conectando - Amarillo */
--status-connecting: 43 96% 56%;      /* #EAB308 */
--status-connecting-bg: 43 96% 96%;

/* Sincronizando - Azul */
--status-syncing: 217 91% 60%;        /* #3B82F6 */
--status-syncing-bg: 217 91% 96%;
```

---

## 🎨 Backgrounds y Efectos

### Backgrounds Propuestos

#### Opción 1: Gradiente Sutil (Recomendado)
```css
/* Light Mode */
body {
  background: linear-gradient(
    135deg,
    hsl(217 91% 98%) 0%,
    hsl(0 0% 100%) 50%,
    hsl(217 91% 99%) 100%
  );
}

/* Dark Mode */
.dark body {
  background: linear-gradient(
    135deg,
    hsl(222 47% 11%) 0%,
    hsl(217 33% 17%) 50%,
    hsl(222 47% 13%) 100%
  );
}
```

#### Opción 2: Patrón de Puntos Sutil
```css
body {
  background-color: hsl(var(--background));
  background-image: 
    radial-gradient(circle at 1px 1px, hsl(var(--muted)) 1px, transparent 0);
  background-size: 24px 24px;
  opacity: 0.3;
}
```

#### Opción 3: Grid Sutil
```css
body {
  background-color: hsl(var(--background));
  background-image: 
    linear-gradient(hsl(var(--border)) 1px, transparent 1px),
    linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.5;
}
```

### Efectos Visuales

#### 1. Glassmorphism (Modo Moderno)
```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.dark .glass-card {
  background: rgba(17, 24, 39, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

#### 2. Neumorphism Sutil (Modo Suave)
```css
.neumorphic {
  background: hsl(var(--card));
  box-shadow: 
    8px 8px 16px rgba(0, 0, 0, 0.1),
    -8px -8px 16px rgba(255, 255, 255, 0.9);
  border-radius: 16px;
}

.dark .neumorphic {
  box-shadow: 
    8px 8px 16px rgba(0, 0, 0, 0.3),
    -8px -8px 16px rgba(255, 255, 255, 0.05);
}
```

#### 3. Sombras Suaves y Profundidad
```css
.card-elevated {
  box-shadow: 
    0 1px 3px 0 rgba(0, 0, 0, 0.1),
    0 1px 2px -1px rgba(0, 0, 0, 0.1),
    0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.card-elevated:hover {
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -2px rgba(0, 0, 0, 0.1),
    0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

#### 4. Efectos de Hover y Active
```css
.interactive {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}

.interactive:active {
  transform: translateY(0);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
```

---

## ✨ Efectos Especiales

### 1. Animaciones de Estado

#### Pulso para Estados Activos
```css
@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0);
  }
}

.status-active {
  animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

#### Shimmer para Carga
```css
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.loading-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

### 2. Efectos de Transición

#### Fade In Suave
```css
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### Slide In desde Abajo
```css
.slide-up {
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### 3. Efectos de Emergencia

#### Parpadeo Sutil para Alertas
```css
@keyframes subtle-blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.emergency-alert {
  animation: subtle-blink 2s ease-in-out infinite;
  border-left: 4px solid hsl(var(--destructive));
}
```

#### Glow para Acciones Críticas
```css
.critical-action {
  box-shadow: 
    0 0 0 0 rgba(239, 68, 68, 0.7),
    0 0 20px rgba(239, 68, 68, 0.3);
  animation: pulse-glow 2s infinite;
}
```

---

## 🎨 Tipografía

### Fuentes Recomendadas

#### Opción 1: Inter (Recomendado)
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```
- ✅ Excelente legibilidad
- ✅ Moderna y profesional
- ✅ Optimizada para pantallas
- ✅ Buena para números y direcciones

#### Opción 2: Plus Jakarta Sans
```css
font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
```
- ✅ Moderna y amigable
- ✅ Buena para móviles
- ✅ Excelente jerarquía

#### Opción 3: System Font Stack (Actual)
```css
font-family: system-ui, -apple-system, sans-serif;
```
- ✅ Rápida (sin carga)
- ✅ Nativa del sistema
- ✅ Consistente con el OS

**Recomendación**: Mantener system font stack para performance, pero considerar Inter para títulos importantes.

### Tamaños y Pesos

```css
/* Títulos */
h1: 2rem (32px) - font-weight: 700
h2: 1.5rem (24px) - font-weight: 600
h3: 1.25rem (20px) - font-weight: 600

/* Cuerpo */
body: 1rem (16px) - font-weight: 400
small: 0.875rem (14px) - font-weight: 400
tiny: 0.75rem (12px) - font-weight: 400

/* Especiales */
emergency-title: 1.5rem - font-weight: 700
balance: 2rem - font-weight: 700 (números grandes)
address: 0.875rem - font-family: monospace
```

---

## 🎨 Componentes Específicos

### Cards de Emergencia

#### Diseño Propuesto
```tsx
<Card className="
  border-l-4 border-l-destructive
  hover:shadow-lg
  transition-all
  group
  relative
  overflow-hidden
">
  {/* Badge de severidad con glow */}
  <Badge className="absolute top-2 right-2 shadow-lg">
    {severity}
  </Badge>
  
  {/* Contenido con padding generoso */}
  <CardContent className="p-6">
    {/* Título destacado */}
    <h3 className="text-lg font-bold mb-2">{title}</h3>
    
    {/* Descripción con line-clamp */}
    <p className="text-sm text-muted-foreground line-clamp-2">
      {description}
    </p>
    
    {/* Footer con tiempo y acciones */}
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-muted-foreground">
        {timeAgo}
      </span>
      <Button size="sm" variant="ghost">
        Ver detalles
      </Button>
    </div>
  </CardContent>
</Card>
```

### FAB (Floating Action Button)

#### Diseño con Glow
```css
.fab-emergency {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
  box-shadow: 
    0 4px 14px 0 rgba(239, 68, 68, 0.39),
    0 0 0 0 rgba(239, 68, 68, 0.4);
  animation: pulse-glow 2s infinite;
}

.fab-emergency:hover {
  box-shadow: 
    0 6px 20px 0 rgba(239, 68, 68, 0.5),
    0 0 0 4px rgba(239, 68, 68, 0.2);
  transform: scale(1.05);
}
```

### Header con Glassmorphism

```css
header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.dark header {
  background: rgba(17, 24, 39, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## 🎨 Estados Visuales

### Estados de Conexión

#### Conectado
```tsx
<div className="flex items-center gap-2">
  <div className="
    h-3 w-3 rounded-full 
    bg-green-500 
    animate-pulse
    shadow-lg shadow-green-500/50
  " />
  <span className="text-sm font-medium text-green-700 dark:text-green-400">
    Conectado
  </span>
</div>
```

#### Desconectado
```tsx
<div className="flex items-center gap-2">
  <div className="
    h-3 w-3 rounded-full 
    bg-red-500 
    shadow-lg shadow-red-500/50
  " />
  <span className="text-sm font-medium text-red-700 dark:text-red-400">
    Desconectado
  </span>
</div>
```

### Estados de Emergencia

#### Crítica
```tsx
<Badge className="
  bg-red-600 
  text-white 
  shadow-lg 
  shadow-red-500/50
  animate-pulse
">
  CRÍTICA
</Badge>
```

#### Alta
```tsx
<Badge className="
  bg-orange-600 
  text-white 
  shadow-lg 
  shadow-orange-500/50
">
  ALTA
</Badge>
```

---

## 🎨 Iconografía

### Estilo de Iconos
- **Biblioteca**: Lucide React (ya en uso) ✅
- **Estilo**: Outline con peso medio
- **Tamaños**: 
  - Pequeño: 16px
  - Medio: 20px
  - Grande: 24px
  - Extra grande: 32px

### Iconos Clave
- 🚨 **Emergencia**: `AlertTriangle` (rojo)
- 📍 **Ubicación**: `MapPin` (azul)
- ⚡ **Acción Rápida**: `Zap` (amarillo)
- ✅ **Confirmado**: `CheckCircle` (verde)
- ⏱️ **Tiempo**: `Clock` (gris)
- 🔗 **Blockchain**: `Link` (azul)

---

## 🎨 Espaciado y Layout

### Sistema de Espaciado
```css
/* Basado en 4px */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
```

### Border Radius
```css
--radius-sm: 0.375rem;   /* 6px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-full: 9999px;   /* Circular */
```

---

## 🎨 Dark Mode Optimizado

### Consideraciones para Dark Mode
1. ✅ Contraste suficiente (WCAG AA mínimo)
2. ✅ No usar blanco puro (#FFFFFF)
3. ✅ Fondos ligeramente coloreados (no gris puro)
4. ✅ Reducir brillo para uso nocturno
5. ✅ Colores más saturados en dark mode

### Paleta Dark Mode Propuesta
```css
.dark {
  --background: 222 47% 11%;        /* Azul muy oscuro, no negro */
  --foreground: 210 40% 98%;        /* Casi blanco, no #FFF */
  --card: 217 33% 17%;              /* Azul oscuro */
  --muted: 217 20% 25%;             /* Azul medio oscuro */
  --border: 217 30% 30%;            /* Borde visible pero sutil */
}
```

---

## 🎨 Efectos de Microinteracciones

### 1. Feedback Táctil
```css
.button-tactile {
  transition: transform 0.1s ease;
}

.button-tactile:active {
  transform: scale(0.95);
}
```

### 2. Ripple Effect
```css
.ripple {
  position: relative;
  overflow: hidden;
}

.ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple:active::after {
  width: 300px;
  height: 300px;
}
```

### 3. Loading States
```css
.skeleton {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 25%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## 🎨 Recomendaciones Finales

### Prioridad Alta
1. ✅ **Implementar Azul Profesional** como color primario
2. ✅ **Agregar gradiente sutil** en background
3. ✅ **Mejorar sombras** para profundidad
4. ✅ **Agregar animaciones suaves** para transiciones
5. ✅ **Optimizar dark mode** con colores más cálidos

### Prioridad Media
1. ⚠️ **Glassmorphism** en header y modales
2. ⚠️ **Efectos de glow** para acciones críticas
3. ⚠️ **Microinteracciones** mejoradas
4. ⚠️ **Patrón de fondo** sutil

### Prioridad Baja
1. 📝 **Neumorphism** (opcional, puede ser demasiado)
2. 📝 **Animaciones complejas** (solo si mejoran UX)
3. 📝 **Efectos 3D** (evitar, puede distraer)

---

## 📋 Checklist de Implementación

### Fase 1: Colores y Tema
- [ ] Actualizar paleta de colores a Azul Profesional
- [ ] Implementar colores semánticos (emergency-critical, etc.)
- [ ] Optimizar dark mode
- [ ] Agregar variables CSS para nuevos colores

### Fase 2: Backgrounds y Efectos
- [ ] Implementar gradiente sutil en body
- [ ] Agregar sombras mejoradas a cards
- [ ] Implementar glassmorphism en header
- [ ] Agregar efectos de hover mejorados

### Fase 3: Animaciones
- [ ] Agregar animaciones de entrada (fade-in, slide-up)
- [ ] Implementar pulse para estados activos
- [ ] Agregar shimmer para loading states
- [ ] Optimizar transiciones

### Fase 4: Componentes Específicos
- [ ] Mejorar cards de emergencia con bordes y efectos
- [ ] Optimizar FAB con glow effect
- [ ] Mejorar badges de severidad
- [ ] Agregar estados visuales mejorados

---

## 🎨 Ejemplos de Código

### Card de Emergencia Mejorada
```tsx
<Card className="
  group
  relative
  overflow-hidden
  border-l-4
  border-l-destructive
  hover:shadow-xl
  transition-all
  duration-300
  hover:-translate-y-1
">
  <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  <CardContent className="p-6 relative z-10">
    {/* Contenido */}
  </CardContent>
</Card>
```

### Button con Efecto Glow
```tsx
<Button className="
  relative
  overflow-hidden
  bg-gradient-to-r from-primary to-primary/90
  shadow-lg
  shadow-primary/50
  hover:shadow-xl
  hover:shadow-primary/60
  transition-all
">
  <span className="relative z-10">{children}</span>
  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
</Button>
```

---

**Última actualización**: 2026-01-21  
**Próximos pasos**: Implementar Fase 1 (Colores y Tema)
