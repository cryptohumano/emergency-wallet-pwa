/**
 * Floating Action Button (FAB) - Componente reutilizable
 * Optimizado para mobile-first, posicionado en zona óptima de pulgar
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface FABProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline'
  size?: 'default' | 'lg'
  className?: string
  disabled?: boolean
  'aria-label'?: string
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
}: FABProps) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[100] pointer-events-auto',
        'safe-area-inset-bottom safe-area-inset-right'
      )}
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))',
        right: 'max(1rem, env(safe-area-inset-right, 1rem))',
      }}
    >
      <Button
        size={size}
        variant={variant}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'h-14 w-14 md:h-16 md:w-16 rounded-full shadow-lg hover:shadow-xl',
          'transition-all duration-200',
          'flex items-center justify-center',
          'active:scale-95', // Feedback táctil en móvil
          variant === 'destructive' && 'critical-glow', // Glow effect para emergencias
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
