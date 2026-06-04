import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('admin' | 'organizer' | 'athlete')[];
}

// Regras estritas:
// /atleta      → apenas athlete
// /organizador → organizer ou admin
// /admin       → apenas admin
// Acesso negado → redireciona para /login

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location, denied: false }} replace />;
  }

  if (allowedRoles && user) {
    const role = user.role as string;

    if (!allowedRoles.includes(role as any)) {
      // Acesso negado — redirecionar para /login com mensagem
      return <Navigate to="/login" state={{ from: location, denied: true, message: 'Acesso negado para este perfil.' }} replace />;
    }
  }

  return <>{children}</>;
}
