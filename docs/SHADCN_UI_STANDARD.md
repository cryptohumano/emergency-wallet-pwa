# Estándar shadcn/ui - Emergency Wallet

## 🎯 Principio Fundamental

**TODO el código de UI debe usar componentes de shadcn/ui como base.**

Este documento establece el estándar para el desarrollo de UI en Emergency Wallet.

## ✅ Configuración Actual

### Configuración de shadcn/ui
- **Archivo**: `components.json`
- **Estilo**: `new-york`
- **Base Color**: `stone`
- **CSS Variables**: ✅ Habilitado
- **Icon Library**: `lucide-react`
- **Aliases**:
  - `@/components` → `src/components`
  - `@/components/ui` → `src/components/ui`
  - `@/lib/utils` → `src/lib/utils`

### Componentes Instalados (52 componentes)

#### Core UI Components
- ✅ accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button
- ✅ calendar, card, carousel, chart, checkbox, collapsible, command
- ✅ context-menu, dialog, drawer, dropdown-menu, empty, field, form
- ✅ hover-card, input, input-group, input-otp, item, kbd, label
- ✅ menubar, navigation-menu, pagination, popover, progress, radio-group
- ✅ resizable, scroll-area, select, separator, sheet, sidebar, skeleton
- ✅ slider, sonner, spinner, switch, table, tabs, textarea
- ✅ toggle, toggle-group, tooltip

## 📋 Reglas de Desarrollo

### 1. **NUNCA crear componentes UI desde cero**
❌ **NO hacer:**
```tsx
// ❌ Componente personalizado sin base shadcn/ui
const MyButton = ({ children, onClick }) => (
  <button onClick={onClick} className="custom-button">
    {children}
  </button>
)
```

✅ **SÍ hacer:**
```tsx
// ✅ Usar Button de shadcn/ui
import { Button } from '@/components/ui/button'

const MyButton = ({ children, onClick }) => (
  <Button onClick={onClick}>
    {children}
  </Button>
)
```

### 2. **Siempre importar desde `@/components/ui`**
✅ **Correcto:**
```tsx
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
```

❌ **Incorrecto:**
```tsx
// ❌ No crear componentes personalizados
import { MyCustomButton } from '@/components/custom/MyButton'
```

### 3. **Extender componentes shadcn/ui cuando sea necesario**
✅ **Correcto - Extender con variantes:**
```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Extender Button con variantes personalizadas
export function EmergencyButton({ className, ...props }) {
  return (
    <Button
      className={cn("bg-red-600 hover:bg-red-700", className)}
      {...props}
    />
  )
}
```

### 4. **Usar `cn()` para combinar clases**
✅ **Siempre usar la utilidad `cn()` de shadcn/ui:**
```tsx
import { cn } from '@/lib/utils'

<div className={cn("base-classes", conditionalClass && "conditional-class")} />
```

## 🔍 Componentes Personalizados Permitidos

Solo se permiten componentes personalizados que:
1. **No tienen equivalente en shadcn/ui** (ej: QR Code, Address Display)
2. **Son específicos del dominio** (ej: EmergencyCard, BlockchainMonitor)
3. **Combinan múltiples componentes shadcn/ui** (ej: DatePicker usando Calendar + Popover)

### Componentes Personalizados Necesarios

#### 1. **Combobox** (No disponible en registry)
- **Ubicación**: `src/components/ui/combobox.tsx`
- **Base**: `popover` + `command`
- **Uso**: Búsqueda con autocompletado

#### 2. **Date Picker** (No disponible en registry)
- **Ubicación**: `src/components/ui/date-picker.tsx`
- **Base**: `calendar` + `popover` + `input`
- **Uso**: Selección de fechas

#### 3. **Componentes de Dominio**
- `EmergencyCard` - Card especializada para emergencias
- `AddressDisplay` - Mostrar direcciones SS58 con copy
- `BalanceDisplay` - Mostrar balances con formato
- `TransactionCard` - Card especializada para transacciones
- `QRCode` - Mostrar códigos QR (usar `qrcode.react`)

## 🚫 Componentes Prohibidos

### NO crear estos componentes personalizados:
- ❌ Botones personalizados (usar `Button` de shadcn/ui)
- ❌ Cards personalizados (usar `Card` de shadcn/ui)
- ❌ Inputs personalizados (usar `Input` de shadcn/ui)
- ❌ Modales personalizados (usar `Dialog` o `Sheet` de shadcn/ui)
- ❌ Formularios personalizados (usar `Form` de shadcn/ui)
- ❌ Tablas personalizadas (usar `Table` de shadcn/ui)

## 📦 Instalación de Nuevos Componentes

### Proceso Estándar

1. **Verificar si existe en shadcn/ui registry:**
   ```bash
   npx shadcn@latest add [component-name]
   ```

2. **Si no existe, crear usando componentes base:**
   - Revisar documentación de shadcn/ui
   - Usar componentes base existentes
   - Seguir patrones de shadcn/ui

3. **Actualizar este documento** con el nuevo componente

### Comandos Útiles

```bash
# Instalar componente individual
npx shadcn@latest add button

# Instalar múltiples componentes
npx shadcn@latest add button card dialog

# Ver componentes disponibles
npx shadcn@latest add --help
```

## 🎨 Estilos y Temas

### Usar CSS Variables de shadcn/ui
```css
/* ✅ Correcto - Usar variables de tema */
.card {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
}

/* ❌ Incorrecto - Colores hardcodeados */
.card {
  background-color: #ffffff;
  color: #000000;
}
```

### Variables Disponibles
- `--background`, `--foreground`
- `--card`, `--card-foreground`
- `--primary`, `--primary-foreground`
- `--secondary`, `--secondary-foreground`
- `--muted`, `--muted-foreground`
- `--accent`, `--accent-foreground`
- `--destructive`, `--destructive-foreground`
- `--border`, `--input`, `--ring`

## 🔄 Migración de Componentes Existentes

### Checklist de Migración

Para cada componente personalizado existente:

- [ ] ¿Existe equivalente en shadcn/ui?
  - [ ] Sí → Reemplazar con componente shadcn/ui
  - [ ] No → ¿Puede crearse usando componentes base?
    - [ ] Sí → Crear usando componentes base
    - [ ] No → Documentar por qué es necesario mantenerlo

### Ejemplo de Migración

**Antes:**
```tsx
// ❌ Componente personalizado
const CustomButton = ({ children, onClick }) => (
  <button 
    onClick={onClick}
    className="px-4 py-2 bg-blue-500 text-white rounded"
  >
    {children}
  </button>
)
```

**Después:**
```tsx
// ✅ Usar Button de shadcn/ui
import { Button } from '@/components/ui/button'

const MyButton = ({ children, onClick }) => (
  <Button onClick={onClick}>
    {children}
  </Button>
)
```

## 📚 Recursos

- [Documentación shadcn/ui](https://ui.shadcn.com)
- [Componentes disponibles](https://ui.shadcn.com/docs/components)
- [Ejemplos de código](https://ui.shadcn.com/examples)
- [Configuración](https://ui.shadcn.com/docs/installation)

## ✅ Verificación

Antes de hacer commit, verificar:

- [ ] ¿Todos los componentes UI usan shadcn/ui?
- [ ] ¿Se usa `cn()` para combinar clases?
- [ ] ¿Se usan variables CSS de tema?
- [ ] ¿Los componentes personalizados están documentados?
- [ ] ¿Se siguen los patrones de shadcn/ui?

---

**Última actualización**: 2026-01-21  
**Versión**: 1.0.0  
**Branch**: `feature/ui-improvements`
