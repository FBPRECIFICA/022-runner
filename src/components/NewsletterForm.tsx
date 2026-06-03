import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, CheckCircle } from 'lucide-react';

export function NewsletterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: err } = await supabase.from('newsletter').insert({ name: name.trim(), email: email.trim() });
    if (err?.code === '23505') {
      setError('Este e-mail já está cadastrado.');
    } else if (err) {
      setError('Erro ao cadastrar. Tente novamente.');
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  return (
    <section className="py-14" style={{ backgroundColor: '#111111' }}>
      <div className="container mx-auto px-4 max-w-xl text-center">
        <Mail size={36} className="mx-auto mb-4" style={{ color: '#C9A84C' }} />
        <h2 className="text-2xl font-bold text-white mb-2">Fique por dentro</h2>
        <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
          Receba avisos de novos eventos, resultados e promoções da Região dos Lagos.
        </p>

        {done ? (
          <div className="flex items-center justify-center gap-2 text-green-400 font-semibold">
            <CheckCircle size={20} /> Cadastrado com sucesso!
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <input value={name} onChange={e => setName(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl text-sm bg-white text-gray-900 focus:outline-none"
              placeholder="Seu nome" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl text-sm bg-white text-gray-900 focus:outline-none"
              placeholder="Seu e-mail" required />
            <button type="submit" disabled={loading}
              className="px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap"
              style={{ backgroundColor: '#C9A84C', color: '#000' }}>
              {loading ? '...' : 'Cadastrar'}
            </button>
          </form>
        )}
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
      </div>
    </section>
  );
}
