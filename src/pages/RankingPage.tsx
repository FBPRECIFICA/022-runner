import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Medal } from 'lucide-react';
import { LAGOS_REGION_CITIES } from '../types';

const PAGE_SIZE = 20;

export function RankingPage() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => { setPage(1); setRanking([]); }, [city]);
  useEffect(() => { loadRanking(page); }, [page, city]);

  const loadRanking = async (p: number) => {
    setLoading(true);
    let q = supabase.from('registrations').select('user_id, name, city, distance_name, status').neq('status', 'cancelled');
    if (city) q = q.eq('city', city);
    const { data } = await q;

    const map: Record<string, { name: string; city: string; events: number; km: number; medals: number }> = {};
    (data || []).forEach(r => {
      if (!map[r.name]) map[r.name] = { name: r.name, city: r.city || '', events: 0, km: 0, medals: 0 };
      map[r.name].events++;
      map[r.name].km += parseFloat(r.distance_name) || 0;
      if (r.status === 'confirmed') map[r.name].medals++;
    });

    const sorted = Object.values(map).sort((a, b) => b.events - a.events || b.km - a.km);
    const slice = sorted.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
    setRanking(prev => p === 1 ? slice : [...prev, ...slice]);
    setHasMore(p * PAGE_SIZE < sorted.length);
    setLoading(false);
  };

  const medalColor = (i: number) => i === 0 ? '#C9A84C' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c3b' : undefined;
  const MedalIcon = ({ i }: { i: number }) => i < 3 ? <Medal size={20} style={{ color: medalColor(i) }} /> : <span className="text-gray-400 text-sm font-bold">#{i + 1}</span>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={28} className="text-yellow-500" />
            <h1 className="text-3xl font-bold text-gray-900">Ranking de Atletas</h1>
          </div>
          <p className="text-gray-500">Os atletas mais ativos da Região dos Lagos</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-6 flex flex-wrap gap-3">
          <select value={city} onChange={e => setCity(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Todas as cidades</option>
            {LAGOS_REGION_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {city && <button onClick={() => setCity('')} className="text-sm text-blue-600 hover:underline">Limpar</button>}
        </div>

        {/* Top 3 */}
        {ranking.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[ranking[1], ranking[0], ranking[2]].map((r, i) => {
              const realIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
              const colors = ['#9ca3af', '#C9A84C', '#cd7c3b'];
              return r ? (
                <div key={r.name} className={`bg-white rounded-xl border shadow-sm p-4 text-center ${realIdx === 0 ? 'md:-mt-4 md:scale-105 border-yellow-300' : ''}`}>
                  <div className="w-14 h-14 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: colors[realIdx] }}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-bold text-gray-900 text-sm truncate">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.city}</p>
                  <p className="text-lg font-bold mt-1" style={{ color: colors[realIdx] }}>{r.events} eventos</p>
                  <p className="text-xs text-gray-400">{r.km.toFixed(0)} km</p>
                </div>
              ) : <div key={i} />;
            })}
          </div>
        )}

        {/* Tabela */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Atleta</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Cidade</th>
                <th className="px-4 py-3 font-medium text-center">Eventos</th>
                <th className="px-4 py-3 font-medium text-center hidden sm:table-cell">Km</th>
                <th className="px-4 py-3 font-medium text-center">Medalhas</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.name} className={`border-t ${i < 3 ? 'bg-yellow-50/30' : ''}`}>
                  <td className="px-4 py-3"><MedalIcon i={i} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: i < 3 ? medalColor(i) : '#2563EB' }}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.city || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{r.events}</td>
                  <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{r.km.toFixed(0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-yellow-600 font-semibold"><Trophy size={13} /> {r.medals}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="p-6 text-center text-gray-400 text-sm">Carregando...</div>}
          {!loading && ranking.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum atleta encontrado.</div>}
        </div>

        {hasMore && !loading && (
          <div className="flex justify-center mt-5">
            <button onClick={() => setPage(p => p + 1)}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700">
              Carregar mais
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
