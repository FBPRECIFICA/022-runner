import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

type Profile = 'athlete' | 'organizer' | 'admin';

const PROFILES: { key: Profile; icon: string; label: string; desc: string }[] = [
  { key: 'athlete',   icon: '🏃', label: 'ATLETA',         desc: 'Quero me inscrever em eventos' },
  { key: 'organizer', icon: '🎯', label: 'ORGANIZADOR',    desc: 'Quero criar e gerenciar eventos' },
  { key: 'admin',     icon: '⚙️', label: 'ADMINISTRADOR',  desc: 'Acesso administrativo' },
];

function roleToPath(role?: string): string {
  if (role === 'admin')     return '/admin';
  if (role === 'organizer') return '/organizador';
  return '/atleta';
}

export function LoginPage() {
  const { login, loginWithGoogle, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deniedMessage = (location.state as any)?.message || '';

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Redirecionar automaticamente quando user.role carregar do banco após login
  useEffect(() => {
    if (user && isAuthenticated) {
      if (user.role === 'admin')     navigate('/admin',       { replace: true });
      else if (user.role === 'organizer') navigate('/organizador', { replace: true });
      else                           navigate('/atleta',      { replace: true });
    }
  }, [user, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) {
      setError('Selecione um perfil primeiro.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Passa o perfil selecionado — usado como roleOverride em loadUserProfile
      const success = await login(email, password, selectedProfile);
      if (!success) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais.');
      }
      // O useEffect cuida do redirect quando user.role carregar
    } catch {
      setError('Ocorreu um erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Topo preto com logo */}
          <div style={{ backgroundColor: '#000', padding: '24px', textAlign: 'center', borderBottom: '3px solid #C9A84C' }}>
            <img src="/images/logo-022runner.png" alt="022 RUNNER"
              style={{ height: '56px', width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
          </div>

          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Entrar na plataforma</h1>
            <p className="text-gray-500 text-center text-sm mb-4">Selecione seu perfil para continuar</p>

            {deniedMessage && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm text-center mb-4 font-medium">
                🔒 {deniedMessage}
              </div>
            )}

            {/* Cards de perfil */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {PROFILES.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setSelectedProfile(p.key)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-center"
                  style={{
                    borderColor: selectedProfile === p.key ? '#C9A84C' : '#e5e7eb',
                    backgroundColor: selectedProfile === p.key ? '#fffbeb' : '#fff',
                    transform: selectedProfile === p.key ? 'scale(1.03)' : 'scale(1)',
                  }}
                >
                  <span className="text-3xl">{p.icon}</span>
                  <span className="font-bold text-xs text-gray-900">{p.label}</span>
                  <span className="text-xs text-gray-400 leading-tight">{p.desc}</span>
                </button>
              ))}
            </div>

            {/* Formulário — aparece após selecionar perfil */}
            {selectedProfile && (
              <>
                {/* Google */}
                <button
                  type="button"
                  onClick={loginWithGoogle}
                  className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors mb-4 text-sm shadow-sm"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Entrar com Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">ou com e-mail</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                      className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                      style={{ borderColor: '#d1d5db', focusRingColor: '#C9A84C' }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Sua senha"
                        required
                        className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none pr-10"
                        style={{ borderColor: '#d1d5db' }}
                      />
                      <button type="button" onClick={() => setShowPwd(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1">
                      <Link to="/esqueci-senha" className="text-xs" style={{ color: '#C9A84C' }}>Esqueceu a senha?</Link>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                    style={{ backgroundColor: '#C9A84C', color: '#000' }}
                  >
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Entrando...</> : 'Entrar'}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600">
                Não tem conta?{' '}
                <Link to="/cadastro" className="font-bold" style={{ color: '#C9A84C' }}>Criar conta grátis</Link>
              </p>
              {!selectedProfile && (
                <p className="text-xs text-gray-400">Selecione um perfil acima para acessar o formulário</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
