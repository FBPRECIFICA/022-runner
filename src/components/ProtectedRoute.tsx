import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  role?: 'admin' | 'organizer' | 'athlete';
  redirectTo?: string;
}

export function ProtectedRoute({ role, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isOrganizer, isAthlete } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificar papel específico
  if (role === 'admin' && !isAdmin) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (role === 'organizer' && !isOrganizer) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (role === 'athlete' && !isAthlete) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  return <Outlet />;
}
