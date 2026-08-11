import { useState } from 'react';
import { Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  defaultName: string;
  defaultEmail: string;
  onBack: () => void;
}

type Mode = 'entrar' | 'criar';

const inp = 'w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C] text-sm';

export function AccountGate({ defaultName, defaultEmail, onBack }: Props) {
  const { login, register, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('entrar');
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle(window.location.href);
      // A partir daqui o navegador redireciona pro Google — nada mais a fazer aqui.
    } catch {
      setGoogleLoading(false);
      setError('Ocorreu um erro ao conectar com o Google. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Informe seu e-mail.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (mode === 'criar' && !name.trim()) { setError('Informe seu nome completo.'); return; }

    setLoading(true);
    try {
      if (mode === 'entrar') {
        const result = await login(email.trim(), password);
        if (!result.success) {
          const isUnconfirmed = result.errorCode === 'email_not_confirmed' ||
            result.message?.toLowerCase().includes('not confirmed');
          setError(isUnconfirmed
            ? 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.'
            : 'E-mail ou senha incorretos. Verifique suas credenciais.');
          setLoading(false);
        }
        // Sucesso: mantém o spinner — a RegistrationPage avança assim que o contexto de auth atualizar.
      } else {
        const result = await register(name.trim(), email.trim(), password, 'athlete');
        if (!result.success) {
          setError(result.message?.toLowerCase().includes('already registered') || result.message?.toLowerCase().includes('já')
            ? 'Este e-mail já está cadastrado. Tente entrar em vez de criar conta.'
            : (result.message || 'Erro ao criar conta. Tente novamente.'));
          setLoading(false);
        }
        // Sucesso: mesmo comportamento — aguarda o contexto de auth avançar o fluxo.
      }
    } catch {
      setError('Ocorreu um erro. Tente novamente.');
      setLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">{mode === 'entrar' ? 'Entre na sua conta' : 'Crie sua conta'}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pra continuar pro pagamento, você precisa estar logado — isso garante que sua inscrição apareça em "Minhas Inscrições".
        </p>
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-60"
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        )}
        {mode === 'entrar' ? 'Entrar com Google' : 'Cadastrar com Google'}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">ou</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'criar' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" className={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="email" className={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type={showPwd ? 'text' : 'password'}
              className={inp + ' pr-10'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'criar' ? 'Mínimo 6 caracteres' : 'Sua senha'}
            />
            <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full font-bold py-3 rounded-xl text-sm mt-1 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ backgroundColor: '#C9A84C', color: '#000' }}
        >
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'entrar' ? 'Entrando...' : 'Criando conta...'}</> : (mode === 'entrar' ? 'Entrar e continuar' : 'Criar conta e continuar')}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600">
        {mode === 'entrar' ? (
          <>Ainda não tem conta?{' '}
            <button type="button" onClick={() => { setMode('criar'); setError(''); }} className="text-[#C9A84C] font-semibold hover:underline">Criar conta</button>
          </>
        ) : (
          <>Já tem conta?{' '}
            <button type="button" onClick={() => { setMode('entrar'); setError(''); }} className="text-[#C9A84C] font-semibold hover:underline">Entrar</button>
          </>
        )}
      </p>

      <button onClick={onBack} className="w-full border text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50 text-sm">
        ← Voltar
      </button>
    </div>
  );
}
