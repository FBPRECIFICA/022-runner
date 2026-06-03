import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Search, Users } from 'lucide-react';

export function CheckinPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [distanceFilter, setDistanceFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: e } = await supabase.from('events').select('*').eq('slug', eventSlug).single();
      if (e) {
        setEvent(e);
        const { data: regs } = await supabase.from('registrations').select('*').eq('event_id', e.id).neq('status', 'cancelled').order('name');
        setRegistrations(regs || []);
      }
      setLoading(false);
    }
    load();
  }, [eventSlug]);

  const handleCheckin = async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from('registrations').update({ checkin_at: now }).eq('id', id);
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, checkin_at: now } : r));
  };

  const distances = [...new Set(registrations.map(r => r.distance_name))];
  const filtered = registrations.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name?.toLowerCase().includes(q) || r.registration_number?.toLowerCase().includes(q);
    const matchDist = !distanceFilter || r.distance_name === distanceFilter;
    return matchSearch && matchDist;
  });

  const checkedIn = registrations.filter(r => r.checkin_at).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-gray-500">Evento não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">{event.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} className="text-blue-600" />
            <span className="font-semibold text-blue-600">{checkedIn}</span>
            <span className="text-gray-400">/ {registrations.length} check-ins</span>
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: `${registrations.length ? (checkedIn / registrations.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="Buscar por nome ou nº de inscrição" />
          </div>
          <select value={distanceFilter} onChange={e => setDistanceFilter(e.target.value)}
            className="border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Todas</option>
            {distances.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Lista */}
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id}
              className={`bg-white rounded-xl border p-4 flex items-center gap-3 transition-all ${r.checkin_at ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex-1">
                <p className="font-bold text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-400 font-mono">{r.registration_number} · {r.distance_name}</p>
                {r.checkin_at && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    Check-in: {new Date(r.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              {r.checkin_at ? (
                <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  <CheckCircle size={20} /> OK
                </div>
              ) : (
                <button onClick={() => handleCheckin(r.id)}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:scale-95 transition-all">
                  Check-in
                </button>
              )}
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <div className="text-center py-10 text-gray-400">Nenhum inscrito encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
}
