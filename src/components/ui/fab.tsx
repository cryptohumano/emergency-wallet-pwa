/**
 * Floating Action Button (FAB) - Componente reutilizable
 * Optimizado para mobile-first, posicionado en zona óptima de pulgar
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { useRadioMonitor } from '@/contexts/RadioMonitorContext'

interface FABProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline'
  size?: 'default' | 'lg'
  className?: string
  disabled?: boolean
  'aria-label'?: string
  position?: 'left' | 'right'
}

export function FAB({
  icon: Icon,
  label,
  onClick,
  variant = 'default',
  size = 'lg',
  className,
  disabled = false,
  'aria-label': ariaLabel,
  position = 'right',
}: FABProps) {
  const { isExpanded } = useRadioMonitor()
  const positionClass = position === 'left' 
    ? 'left-4 md:left-6 fab-emergency' 
    : 'right-4 md:right-6 fab-navigation'
  
  return (
    <div
      className={cn(
        'fixed bottom-4 md:bottom-6 z-[100] pointer-events-auto',
        positionClass,
        'safe-area-inset-bottom',
        position === 'left' ? 'safe-area-inset-left' : 'safe-area-inset-right',
        'fab-dim', // Clase base para estado dim
        isExpanded && 'fab-dim-active' // Activar dim cuando la tabla está expandida
      )}
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        [position]: 'max(1rem, env(safe-area-inset-' + position + ', 1rem))',
      }}
    >
      <Button
        size={size}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'h-14 w-14 md:h-16 md:w-16 rounded-full',
          'transition-all duration-300',
          'flex items-center justify-center',
          'active:scale-95', // Feedback táctil en móvil
          // Los colores se aplican via CSS para asegurar visibilidad
          className
        )}
        aria-label={ariaLabel || label}
      >
        <Icon className="h-6 w-6 md:h-7 md:w-7" />
        <span className="sr-only">{label}</span>
      </Button>
    </div>
  )
}
