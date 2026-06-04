import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'organizer' | 'athlete')[];
  redirectTo?: string;
}

// Regras de acesso:
// /admin           → apenas admin
// /organizador     → organizer + admin
// /atleta          → athlete + organizer + admin
// Qualquer outra   → conforme allowedRoles passado

export function ProtectedRoute({ children, allowedRoles, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && user) {
    const role = user.role as string;
    // Admin sempre tem acesso a tudo
    if (role === 'admin') return <>{children}</>;
    // Verificar se o role está na lista permitida
    if (!allowedRoles.includes(role as any)) {
      // Redirecionar para o painel correto em vez de / genérico
      const fallback = role === 'organizer' ? '/organizador'
                     : role === 'athlete'   ? '/atleta'
                     : '/login';
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
}
