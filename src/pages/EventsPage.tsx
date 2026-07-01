import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { EventCard } from '../components/EventCard';
import { LAGOS_REGION_CITIES } from '../types';
import type { Event } from '../types';
import { Search, Filter } from 'lucide-react';

const EVENT_TYPES = ['Todos', 'Corrida de Rua', 'Trail Run', 'Ciclismo', 'Triathlon', 'Caminhada', 'Outro'];
const PAGE_SIZE = 9;

function supabaseToEvent(e: any): Event {
  const distances = (e.distances || []).map((d: any, i: number) => ({
    id: `d${i}`,
    name: d.name,
    distanceKm: parseFloat(d.name) || 0,
    price: Number(d.price),
  }));
  return {
    id: e.id,
    name: e.title,
    subtitle: e.description?.slice(0, 80) || '',
    description: e.description || '',
    date: e.date,
    startTime: new Date(e.date).toTimeString().slice(0, 5),
    city: e.city,
    state: 'RJ',
    startLocation: e.location || '',
    maxParticipants: e.max_participants || 0,
    currentParticipants: e.registrations?.[0]?.count ?? e.current_participants ?? 0,
    banner: e.banner_url || '',
    distances,
    qualityScore: e.quality_score || 0,
    plan: e.plan || 'free',
    status: e.status === 'published' ? 'registration_open' : e.status,
    organizerId: e.organizer_id || '',
    slug: e.slug,
  };
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );
}

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [city, setCity] = useState('');
  const [type, setType] = useState('Todos');
  const [dateFrom, setDateFrom] = useState('');

  useEffect(() => {
    setPage(1);
    setEvents([]);
  }, [city, type, dateFrom]);

  useEffect(() => {
    fetchEvents(page);
  }, [page, city, type, dateFrom]);

  const fetchEvents = async (p: number) => {
    setLoading(true);
    let query = supabase
      .from('events')
      .select('*, registrations(count)', { count: 'exact' })
      .eq('status', 'published')
      .in('registrations.status', ['paid', 'confirmed', 'presente'])
      .order('date', { ascending: true })
      .range((p - 1) * PAGE_SIZE, p * PAGE_SIZE - 1);

    if (city) query = query.eq('city', city);
    if (type !== 'Todos') query = query.eq('event_type', type);
    if (dateFrom) query = query.gte('date', dateFrom);

    const { data, count } = await query;
    const mapped = (data || []).map(supabaseToEvent);
    setEvents(prev => p === 1 ? mapped : [...prev, ...mapped]);
    setTotal(count || 0);
    setHasMore((p * PAGE_SIZE) < (count || 0));
    setLoading(false);
  };

  const handleLoadMore = () => setPage(prev => prev + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header da página */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Todos os Eventos</h1>
          <p className="text-gray-500 mt-1">
            {loading && events.length === 0 ? 'Carregando...' : `${total} evento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6 flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium mr-2">
            <Filter size={16} /> Filtros
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-gray-500 font-medium">Cidade</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            >
              <option value="">Todas as cidades</option>
              {LAGOS_REGION_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-gray-500 font-medium">Modalidade</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            >
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">A partir de</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
          </div>

          {(city || type !== 'Todos' || dateFrom) && (
            <button
              onClick={() => { setCity(''); setType('Todos'); setDateFrom(''); }}
              className="text-sm text-[#C9A84C] hover:underline self-end pb-2"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Grid */}
        {events.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-500 text-lg font-medium">Nenhum evento encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Tente outros filtros ou volte mais tarde</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map(event => <EventCard key={event.id} event={event} />)}
              {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>

            {hasMore && !loading && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-[#C9A84C] text-white font-semibold rounded-xl hover:bg-[#B8962E] transition-colors shadow-sm"
                >
                  Carregar mais eventos
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
