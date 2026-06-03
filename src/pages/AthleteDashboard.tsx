import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Trophy, Calendar, MapPin, Clock, XCircle, ArrowRight, Star } from 'lucide-react';

export function AthleteDashboard() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: regs }, { data: evts }] = await Promise.all([
        supabase.from('registrations').select('*, event:event_id(title, date, city, location, slug, banner_url)').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('events').select('*').eq('status', 'published').order('date', { ascending: true }).limit(4),
      ]);
      setRegistrations(regs || []);
      setRecommended(evts || []);
      setLoading(false);
    }
    if (user) load();
  }, [user]);

  const handleCancel = async (id: string) => {
    await supabase.from('registrations').update({ status: 'cancelled' }).eq('id', id);
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
  };

  const active = registrations.filter(r => r.status !== 'cancelled' && new Date((r.event?.date) || 0) >= new Date());
  const past = registrations.filter(r => r.status !== 'cancelled' && new Date((r.event?.date) || 0) < new Date());
  const totalKm = past.reduce((acc, r) => acc + (parseFloat(r.distance_name) || 0), 0);
  const initials = user?.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'AT';

  const statusBadge = (s: string) => ({
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }[s] || 'bg-gray-100 text-gray-600');

  const statusLabel = (s: string) => ({ confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado' }[s] || s);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header perfil */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563EB, #1d4ed8)' }}>
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="inline-block mt-1 text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Atleta</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Calendar size={20} className="text-blue-600" />, value: registrations.filter(r => r.status !== 'cancelled').length, label: 'Corridas' },
            { icon: <MapPin size={20} className="text-green-600" />, value: `${totalKm.toFixed(0)} km`, label: 'Percorridos' },
            { icon: <Trophy size={20} className="text-yellow-500" />, value: past.length, label: 'Medalhas' },
            { icon: <Clock size={20} className="text-purple-600" />, value: active.length > 0 ? active[0].event?.title?.split(' ')[0] + '...' : '—', label: 'Próximo evento' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-gray-50">{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Inscrições ativas */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Inscrições Ativas</h2>
          {loading ? (
            <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : active.length === 0 ? (
            <div className="text-center py-8">
              <Calendar size={36} className="mx-auto text-gray-200 mb-2" />
              <p className="text-gray-400 text-sm">Nenhuma inscrição ativa.</p>
              <Link to="/eventos" className="mt-3 inline-block text-blue-600 text-sm hover:underline">Ver eventos disponíveis</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {active.map(r => (
                <div key={r.id} className="flex items-center gap-4 border rounded-xl p-4">
                  {r.event?.banner_url && <img src={r.event.banner_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.event?.title}</p>
                    <p className="text-xs text-gray-500">{r.event?.city} · {r.distance_name} · {new Date(r.event?.date).toLocaleDateString('pt-BR')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(r.status)}`}>{statusLabel(r.status)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <p className="font-bold text-blue-600 text-sm">R$ {Number(r.amount).toFixed(2).replace('.', ',')}</p>
                    <p className="text-xs font-mono text-gray-400">{r.registration_number}</p>
                    {r.status !== 'cancelled' && (
                      <button onClick={() => handleCancel(r.id)}
                        className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                        <XCircle size={12} /> Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Histórico */}
        {past.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Star size={16} className="text-yellow-500" /> Histórico de Eventos</h2>
            <div className="space-y-2">
              {past.map(r => (
                <div key={r.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{r.event?.title}</p>
                    <p className="text-xs text-gray-400">{r.distance_name} · {new Date(r.event?.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <Trophy size={16} className="text-yellow-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eventos recomendados */}
        {recommended.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Próximos Eventos Recomendados</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {recommended.map(e => (
                <Link key={e.id} to={`/evento/${e.slug}`}
                  className="flex items-center gap-3 border rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                  {e.banner_url && <img src={e.banner_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{e.title}</p>
                    <p className="text-xs text-gray-400">{e.city} · {new Date(e.date).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <ArrowRight size={16} className="text-gray-400 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
