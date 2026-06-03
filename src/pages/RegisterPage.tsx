import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, User, Mail, Lock, Building2, Trophy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type UserType = 'athlete' | 'organizer';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [userType, setUserType] = useState<UserType>('athlete');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Informe seu nome completo.'); return; }
    if (!email.trim()) { setError('Informe seu e-mail.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (!agreed) { setError('Aceite os termos de uso para continuar.'); return; }

    setIsLoading(true);
    try {
      const ok = await register(name.trim(), email.trim(), password, userType);
      if (!ok) {
        setError('Erro ao criar conta. Verifique se o e-mail já está cadastrado.');
        return;
      }
      navigate(userType === 'organizer' ? '/organizador' : '/atleta');
    } catch {
      setError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Topo */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <div className="text-center">
              <img src="/images/logo-022runner.png" alt="022 RUNNER" className="h-14 w-auto mx-auto mb-4 object-contain" />
              <h1 className="text-2xl font-bold text-gray-900">Crie sua conta</h1>
              <p className="text-gray-500 mt-1 text-sm">Junte-se à plataforma de eventos da Região dos Lagos</p>
            </div>
          </div>

          {/* Tipo de perfil */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setUserType('athlete')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                userType === 'athlete' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Trophy size={24} className={userType === 'athlete' ? 'text-blue-600' : 'text-gray-400'} />
              <span className={`font-semibold text-sm ${userType === 'athlete' ? 'text-blue-600' : 'text-gray-600'}`}>Sou Atleta</span>
              <span className="text-xs text-gray-400 text-center">Inscreva-se em eventos</span>
            </button>
            <button
              type="button"
              onClick={() => setUserType('organizer')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                userType === 'organizer' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Building2 size={24} className={userType === 'organizer' ? 'text-blue-600' : 'text-gray-400'} />
              <span className={`font-semibold text-sm ${userType === 'organizer' ? 'text-blue-600' : 'text-gray-600'}`}>Sou Organizador</span>
              <span className="text-xs text-gray-400 text-center">Crie e gerencie eventos</span>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-600">
                Concordo com os{' '}
                <Link to="/termos-de-uso" className="text-blue-600 hover:underline font-medium">Termos de Uso</Link>
                {' '}e{' '}
                <Link to="/politica-de-privacidade" className="text-blue-600 hover:underline font-medium">Política de Privacidade</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Criando conta...</> : 'Criar Conta Grátis'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <p className="text-center text-sm text-gray-600">
            Já tem conta?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
          </p>

          <div className="mt-5 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              <strong>Grátis para todos.</strong> A plataforma retém 10% sobre inscrições pagas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
