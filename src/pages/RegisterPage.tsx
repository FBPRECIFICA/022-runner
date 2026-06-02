import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft, User, Mail, Lock } from 'lucide-react';

type UserType = 'athlete' | 'organizer';

export function RegisterPage() {
  const [userType, setUserType] = useState<UserType>('athlete');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    // Simular cadastro
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Redirecionar para login
      navigate('/login');
    } catch (err) {
      setError('Ocorreu um erro ao criar a conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 mb-6">
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </Link>
            
            <div className="text-center">
              <img 
                src="/images/logo-022runner.png" 
                alt="022 RUNNER" 
                className="h-16 w-auto mx-auto mb-4"
              />
              <h1 className="text-2xl font-bold text-gray-900">Crie sua conta</h1>
              <p className="text-gray-600 mt-2">Junte-se à maior plataforma de eventos esportivos da Região dos Lagos</p>
            </div>
          </div>

          {/* Seleção de tipo de usuário */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-8">
            <button
              onClick={() => setUserType('athlete')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                userType === 'athlete' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sou Atleta
            </button>
            <button
              onClick={() => setUserType('organizer')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                userType === 'organizer' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Sou Organizador
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Nome completo
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  required
                  className="pl-12"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Digite seu e-mail"
                  required
                  className="pl-12"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="pl-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Mínimo 6 caracteres</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua senha"
                  required
                  className="pl-12 pr-12"
                />
              </div>
            </div>

            {/* Termos */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-blue-600 border-gray-300 rounded mt-1 focus:ring-blue-500" required />
              <span className="text-sm text-gray-600">
                Concordo com os <Link to="/termos-de-uso" className="text-blue-600 hover:text-blue-700 font-medium">Termos de Uso</Link> e 
                <Link to="/politica-de-privacidade" className="text-blue-600 hover:text-blue-700 font-medium">Política de Privacidade</Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="my-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-500">ou</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>

          {/* Já tem conta */}
          <p className="text-center text-gray-600">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
              Entrar
            </Link>
          </p>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Importante:</strong> O cadastro é gratuito para atletas e organizadores. 
              A plataforma retém uma taxa de 0,1 (10%) sobre o valor da inscrição.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
