import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { EventCard } from '../components/EventCard';
import { LAGOS_REGION_CITIES } from '../types';
import type { Event } from '../types';
import { supabaseToEvent } from '../utils/eventMapper';
import { Search, SlidersHorizontal } from 'lucide-react';

const EVENT_TYPES = ['Todos', 'Corrida de Rua', 'Trail Run', 'Ciclismo', 'Triathlon', 'Caminhada', 'Outro'];

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const [city, setCity] = useState('');
  const [type, setType] = useState('Todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sort, setSort] = useState<'date' | 'price' | 'relevance'>('relevance');
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = params.get('q');
    if (q) { setQuery(q); doSearch(q); }
  }, []);

  const doSearch = async (q = query) => {
    setLoading(true);
    setSearched(true);
    setParams(q ? { q } : {});

    let qb = supabase.from('events').select('*, registration_types(price)').eq('status', 'published');
    if (q.trim()) qb = qb.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    if (city) qb = qb.eq('city', city);
    if (type !== 'Todos') qb = qb.eq('event_type', type);
    if (dateFrom) qb = qb.gte('date', dateFrom);
    if (dateTo) qb = qb.lte('date', dateTo);

    const [{ data }, { data: counts }] = await Promise.all([qb.order('date', { ascending: true }), supabase.rpc('get_events_confirmed_counts')]);
    const countByEvent = new Map<string, number>((counts || []).map((c: any) => [c.event_id, c.confirmed_count]));
    let mapped = (data || []).map(e => supabaseToEvent(e, countByEvent.get(e.id) ?? 0));

    if (priceMin || priceMax) {
      mapped = mapped.filter(e => {
        const minP = Math.min(...e.distances.map(d => d.price));
        if (priceMin && minP < Number(priceMin)) return false;
        if (priceMax && minP > Number(priceMax)) return false;
        return true;
      });
    }

    if (sort === 'date') mapped.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sort === 'price') mapped.sort((a, b) => Math.min(...a.distances.map(d => d.price)) - Math.min(...b.distances.map(d => d.price)));

    setResults(mapped);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search bar */}
      <div className="bg-white border-b py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Buscar Eventos</h1>
          <form onSubmit={e => { e.preventDefault(); doSearch(); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-sm"
                style={{ borderColor: '#d1d5db' }}
                placeholder="Buscar por nome ou descrição do evento..." />
            </div>
            <button type="submit"
              className="px-6 py-3 rounded-xl font-bold text-sm"
              style={{ backgroundColor: '#C9A84C', color: '#000' }}>
              Buscar
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filtros */}
        <details className="bg-white rounded-xl border shadow-sm mb-6">
          <summary className="px-4 py-3 cursor-pointer flex items-center gap-2 text-sm font-semibold text-gray-700 select-none">
            <SlidersHorizontal size={16} /> Filtros avançados
          </summary>
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Cidade</label>
              <select value={city} onChange={e => setCity(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="">Todas</option>
                {LAGOS_REGION_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Modalidade</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Ordenar por</label>
              <select value={sort} onChange={e => setSort(e.target.value as any)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="relevance">Relevância</option>
                <option value="date">Data</option>
                <option value="price">Preço</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Data de</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Data até</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium block mb-1">R$ mín</label>
                <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium block mb-1">R$ máx</label>
                <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="999" />
              </div>
            </div>
          </div>
        </details>

        {/* Resultados */}
        {!searched ? (
          <div className="text-center py-16 text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-20" />
            <p>Digite um termo para buscar eventos</p>
          </div>
        ) : loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Nenhum evento encontrado</p>
            <p className="text-sm mt-1">Tente outros termos ou filtros</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
