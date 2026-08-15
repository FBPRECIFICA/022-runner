import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (err) {
        setError('Erro ao enviar e-mail. Verifique o endereço informado.');
      } else {
        setSent(true);
      }
    } catch {
      // Sem isso, uma falha de rede deixava o botão girando pra sempre, sem
      // mensagem nenhuma — exatamente o "o sistema não fez nada" relatado.
      setError('Erro de conexão ao enviar e-mail. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f9fafb' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div style={{ backgroundColor: '#000', padding: '24px', textAlign: 'center', borderBottom: '3px solid #C9A84C' }}>
            <img src="/images/logo-022runners.png" alt="022 RUNNER" style={{ height: '56px', width: 'auto', objectFit: 'contain', margin: '0 auto' }} />
          </div>
          <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Recuperar senha</h1>
            <p className="text-gray-500 text-center text-sm mb-6">Informe seu e-mail para receber o link de redefinição.</p>

            {sent ? (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-4 rounded-xl text-center space-y-2">
                <p className="font-semibold">E-mail enviado!</p>
                <p className="text-sm">Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
              </div>
            ) : (
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
                    required
                    placeholder="seu@email.com"
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: '#d1d5db' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: '#C9A84C', color: '#000' }}
                >
                  {loading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar link de recuperação'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm font-medium" style={{ color: '#C9A84C' }}>Voltar ao login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
