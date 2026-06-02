import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isAthlete: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: { email: string; password: string; user: User }[] = [
  { email: 'admin@022runner.com', password: 'admin123', user: { id: 'admin-001', name: 'Admin Master', email: 'admin@022runner.com', role: 'admin', phone: '(22) 97404-4125' } },
  { email: 'marcos@email.com', password: 'marcos123', user: { id: 'ath-001', name: 'Marcos Aurélio', email: 'marcos@email.com', role: 'athlete' } },
  { email: 'org@email.com', password: 'org123', user: { id: 'org-001', name: 'João Silva', email: 'org@corridadoslagos.com', role: 'organizer' } },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('022runner_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }
    setIsInitialized(true);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 500));
    const mockUser = mockUsers.find(u => u.email === email && u.password === password);
    if (mockUser) {
      setUser(mockUser.user);
      localStorage.setItem('022runner_user', JSON.stringify(mockUser.user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('022runner_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOrganizer: user?.role === 'organizer',
    isAthlete: user?.role === 'athlete',
    login,
    logout,
  };

  if (!isInitialized) return null;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
