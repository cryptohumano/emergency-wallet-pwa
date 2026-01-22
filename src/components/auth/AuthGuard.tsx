import { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useKeyringContext } from '@/contexts/KeyringContext'
import Onboarding from '@/pages/Onboarding'
import { Unlock } from './Unlock'

interface AuthGuardProps {
  children: ReactNode
}

/**
 * Componente que protege las rutas y muestra onboarding o unlock según sea necesario
 * OPTIMIZACIÓN LCP: Renderiza Unlock inmediatamente como placeholder mientras verifica estado
 * Esto permite que el CardTitle (elemento LCP) se renderice más rápido
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isReady, isUnlocked, hasStoredAccounts } = useKeyringContext()
  const location = useLocation()

  // OPTIMIZACIÓN LCP: isReady ahora es true inmediatamente, así que siempre podemos renderizar
  // Si hasStoredAccounts aún no se ha verificado, mostrar Unlock como placeholder
  // Esto permite que el CardTitle se renderice inmediatamente para mejor LCP
  
  // Si no hay cuentas almacenadas, mostrar onboarding
  if (hasStoredAccounts === false) {
    const currentPath = location.pathname
    
    // Permitir acceso solo a /accounts/import durante el onboarding
    const isImportRoute = currentPath === '/accounts/import' || currentPath.startsWith('/accounts/import?')
    
    if (isImportRoute) {
      return <>{children}</>
    }
    
    return <Onboarding />
  }

  // Si hay cuentas pero no está desbloqueado, mostrar unlock
  if (hasStoredAccounts === true && !isUnlocked) {
    return <Unlock />
  }

  // Si está desbloqueado, mostrar el contenido protegido
  if (hasStoredAccounts === true && isUnlocked) {
    return <>{children}</>
  }

  // OPTIMIZACIÓN LCP: Mientras se verifica hasStoredAccounts (undefined),
  // mostrar Unlock como placeholder para que el CardTitle se renderice inmediatamente
  // Esto mejora el LCP porque el elemento crítico se muestra sin esperar verificaciones
  return <Unlock />
}
