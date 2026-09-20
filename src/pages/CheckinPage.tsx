import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Search, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export function CheckinPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [shirtStock, setShirtStock] = useState<Record<string, number>>({});
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
        // Grade de produção configurada em shirt_stock (RLS já permite leitura
        // pro organizador dono/admin) — mostrada ao lado da contagem de
        // inscritos por tamanho pra não confundir as duas coisas (achado
        // 20/09/2026: o total de inscritos por tamanho não é a grade encomendada).
        const { data: stock } = await supabase.from('shirt_stock').select('size, quantity_total').eq('event_id', e.id);
        setShirtStock(Object.fromEntries((stock || []).map((s: any) => [s.size, s.quantity_total])));
      }
      setLoading(false);
    }
    load();
  }, [eventSlug]);

  // Contador "em tempo real": se mais de um celular/tablet estiver fazendo
  // check-in ao mesmo tempo (comum na entrega ao vivo), cada um só via os
  // check-ins feitos por ele mesmo até recarregar a página inteira. Polling
  // simples (sem Realtime, sem alterar o fluxo de check-in) resolve isso.
  // Merge em vez de substituir a lista inteira: um check-in local que acabou
  // de ser clicado (setRegistrations otimista em handleCheckin) não pode
  // "voltar" pra não-presente só porque um poll concorrente ainda pegou o
  // banco um instante antes do UPDATE terminar — checkin_at nunca regride.
  useEffect(() => {
    if (!event?.id) return;
    const intervalId = setInterval(async () => {
      const { data: regs } = await supabase.from('registrations').select('*').eq('event_id', event.id).neq('status', 'cancelled').order('name');
      if (!regs) return;
      setRegistrations(prev => {
        const localCheckins = new Map(prev.map(r => [r.id, r.checkin_at]));
        return regs.map(r => ({ ...r, checkin_at: r.checkin_at || localCheckins.get(r.id) || null }));
      });
    }, 15000);
    return () => clearInterval(intervalId);
  }, [event?.id]);

  const handleCheckin = async (id: string) => {
    // checkin_at é o único campo de presença - "status" já é usado pra status de
    // pagamento (paid/pending/cancelled) em toda a plataforma (exportação, painel
    // financeiro, etc). Sobrescrever "status" aqui apagava o status de pagamento
    // e quebrava esses outros lugares assim que o organizador fizesse o 1º check-in.
    //
    // RPC em vez de update direto: a tabela nunca teve policy de UPDATE pro
    // organizador, então o update direto sempre casava 0 linhas por RLS sem
    // erro nenhum — a UI mostrava "Presente" localmente mas nada era gravado
    // (achado 04/09/2026, 567 check-ins da Corrida Solidária nunca persistidos).
    const { data, error } = await supabase.rpc('mark_registration_checkin', { p_registration_id: id });
    if (error) { toast.error('Erro ao confirmar check-in: ' + error.message); return; }
    const now = data?.checkin_at ?? new Date().toISOString();
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, checkin_at: now } : r));
  };

  const distances = [...new Set(registrations.map(r => r.distance_name))];
  const filtered = registrations.filter(r => {
    const q = search.toLowerCase();
    const qDigits = search.replace(/\D/g, '');
    const matchSearch = !q
      || r.name?.toLowerCase().includes(q)
      || r.registration_number?.toLowerCase().includes(q)
      || (qDigits && r.cpf?.includes(qDigits));
    const matchDist = !distanceFilter || r.distance_name === distanceFilter;
    return matchSearch && matchDist;
  });

  const checkedIn = registrations.filter(r => r.checkin_at).length;

  // Contagem por tamanho de camiseta — ajuda a controlar quantas camisas de
  // cada tamanho ainda faltam entregar. Ignora quem não tem tamanho (Kit
  // Econômico, sem camiseta) e sempre reflete o evento inteiro, igual ao
  // contador geral acima (não é afetado pelo filtro de busca/distância).
  const sizeBreakdown = registrations.reduce((acc: Record<string, { checked: number; total: number }>, r) => {
    if (!r.shirt_size) return acc;
    if (!acc[r.shirt_size]) acc[r.shirt_size] = { checked: 0, total: 0 };
    acc[r.shirt_size].total++;
    if (r.checkin_at) acc[r.shirt_size].checked++;
    return acc;
  }, {});
  const sizeBreakdownEntries = Object.entries(sizeBreakdown).sort(([a], [b]) => a.localeCompare(b));

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-gray-500">Evento não encontrado.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">{event.title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">Check-in confirma a presença do atleta no dia do evento — não afeta o pagamento da inscrição.</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} className="text-[#C9A84C]" />
            <span className="font-semibold text-[#C9A84C]">{checkedIn}</span>
            <span className="text-gray-400">/ {registrations.length} check-ins</span>
          </div>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full bg-[#C9A84C] transition-all"
              style={{ width: `${registrations.length ? (checkedIn / registrations.length) * 100 : 0}%` }} />
          </div>
        </div>
        {sizeBreakdownEntries.length > 0 && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {sizeBreakdownEntries.map(([size, { checked, total }]) => (
              <span key={size} className="text-xs bg-gray-100 rounded-full px-2.5 py-1 font-medium text-gray-600">
                {size}: <span className="text-[#C9A84C] font-bold">{checked}</span>/{total} inscritos
                {shirtStock[size] != null && <span className="text-gray-400"> · grade {shirtStock[size]}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Filtros */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
              placeholder="Nome, CPF ou número de peito" />
          </div>
          <select value={distanceFilter} onChange={e => setDistanceFilter(e.target.value)}
            className="border rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white">
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
                <p className="font-bold text-gray-900 text-base">{r.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-sm font-mono font-bold text-[#C9A84C]">#{r.registration_number}</span>
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-500">{r.distance_name}</span>
                  {r.shirt_size && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">
                      Camisa {r.shirt_size}
                    </span>
                  )}
                  {r.status === 'paid' || r.status === 'confirmed' ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Pago</span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">Pagamento pendente</span>
                  )}
                </div>
                {r.checkin_at && (
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    Presente · {new Date(r.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              {r.checkin_at ? (
                <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                  <CheckCircle size={20} /> Presente
                </div>
              ) : (
                <button onClick={() => handleCheckin(r.id)}
                  className="px-4 py-2.5 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#B8962E] active:scale-95 transition-all whitespace-nowrap">
                  Confirmar Check-in
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
