import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isAthlete: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; errorCode?: string; message?: string }>;
  loginWithGoogle: (redirectTo?: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadUserProfile = async (userId: string) => {
    try {
      // Tenta algumas vezes antes de desistir: logo após um cadastro novo, o registro em
      // public.users (feito por register(), abaixo) pode ainda não ter comitado quando
      // onAuthStateChange já disparou isso aqui — sem retry, cai no fallback sintético
      // abaixo com um `user` que não existe em public.users, e a inscrição que vem na
      // sequência quebra a FK registrations_user_id_fkey. Ver PRIORIDADE MÁXIMA (12/08).
      let data: any = null;
      let error: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const result = await supabase
          .from('users')
          .select('id, name, email, role, phone, city')
          .eq('id', userId)
          .single();
        data = result.data;
        error = result.error;
        if (data) break;
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      console.log('Profile data:', data, 'Error:', error);

      if (data) {
        setUser({
          id: data.id,
          name: data.name || 'Usuário',
          email: data.email || '',
          role: data.role,
          phone: data.phone,
        });
      } else if (error) {
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser?.user) {
          setUser({
            id: authUser.user.id,
            name: authUser.user.email?.split('@')[0] || 'Usuário',
            email: authUser.user.email || '',
            role: 'athlete',
          });
        }
      }

      // Vincula inscrições feitas como convidado (antes de ter conta) ao usuário logado
      supabase.rpc('claim_orphan_registrations').then(({ error: claimError }) => {
        if (claimError) console.warn('claim_orphan_registrations warning:', claimError.message);
      });
    } catch (err) {
      console.error('loadUserProfile error:', err);
    } finally {
      setIsInitialized(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setIsInitialized(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setIsInitialized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; errorCode?: string; message?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return { success: true };
    return { success: false, errorCode: error.code ?? '', message: error.message ?? '' };
  };

  const loginWithGoogle = async (redirectTo?: string): Promise<void> => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo || window.location.origin },
    });
  };

  const register = async (name: string, email: string, password: string, role = 'athlete'): Promise<{ success: boolean; message?: string }> => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) return { success: false, message: error?.message };
    const { error: profileError } = await supabase.from('users').upsert(
      { id: data.user.id, name, email, role },
      { onConflict: 'id', ignoreDuplicates: false }
    );
    if (profileError) {
      console.error('Profile upsert failed:', profileError.message);
      return { success: false, message: 'Erro ao criar seu perfil. Tente novamente.' };
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOrganizer: user?.role === 'organizer',
    isAthlete: user?.role === 'athlete',
    login,
    loginWithGoogle,
    register,
    logout,
  };

  if (!isInitialized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/images/logo-022runners.png" alt="022 RUNNER" style={{ height: 64, margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Carregando...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
