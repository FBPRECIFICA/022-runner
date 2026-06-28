import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('A senha deve ter ao menos 6 caracteres.'); return; }
    if (password !== confirm) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError('Erro ao redefinir senha. O link pode ter expirado. Solicite um novo.');
    } else {
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div style={{ backgroundColor: '#000', padding: '24px', textAlign: 'center', borderBottom: '3px solid #C9A84C' }}>
            <img src="/images/logo-022runners.png" alt="022 RUNNER" style={{ height: '56px', width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
          </div>
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Redefinir senha</h1>
            <p className="text-gray-500 text-center text-sm mb-6">Digite sua nova senha abaixo.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none pr-10"
                    style={{ borderColor: '#d1d5db' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="Repita a nova senha"
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: '#d1d5db' }}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: '#C9A84C', color: '#000' }}
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Salvando...</> : 'Redefinir senha'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
