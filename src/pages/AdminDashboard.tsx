import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Users, Calendar, TrendingUp, Award, Star, Shield, XCircle, Trash2, DollarSign, MessageCircle } from 'lucide-react';

const COLORS = ['#C9A84C', '#C9A84C', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#be185d'];
const LEO_PAGE_SIZE = 20;

type Tab = 'overview' | 'events' | 'users' | 'registrations' | 'leo';

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ events: 0, users: 0, registrations: 0, revenue: 0, platformRevenue: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [leoConversations, setLeoConversations] = useState<any[]>([]);
  const [leoTotal, setLeoTotal] = useState(0);
  const [leoPage, setLeoPage] = useState(0);
  const [leoExpanded, setLeoExpanded] = useState<string | null>(null);
  const [leoLoading, setLeoLoading] = useState(false);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (tab === 'leo') loadLeoConversations(leoPage);
  }, [tab, leoPage]);

  const loadLeoConversations = async (page: number) => {
    setLeoLoading(true);
    const from = page * LEO_PAGE_SIZE;
    const to = from + LEO_PAGE_SIZE - 1;
    const { data, count } = await supabase
      .from('leo_conversations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    setLeoConversations(data || []);
    setLeoTotal(count || 0);
    setLeoLoading(false);
  };

  const loadAll = async () => {
    const [{ data: evts }, { data: usrs }, { data: regs }] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('registrations').select('*').order('created_at', { ascending: false }),
    ]);
    setEvents(evts || []);
    setUsers(usrs || []);
    setRegistrations(regs || []);
    const paidRegs = (regs || []).filter(r => r.status === 'paid' || r.status === 'confirmed');
    const revenue = paidRegs.reduce((a, r) => a + Number(r.base_amount ?? r.amount ?? 0), 0);
    // Usa platform_fee gravado quando disponível; cai para 10% do valor total em inscrições
    // antigas ao modelo de taxa separada (BLOCO73), que foram migradas com platform_fee = 0.
    const platformRevenue = paidRegs.reduce((a, r) => {
      const storedFee = Number(r.platform_fee ?? 0);
      return a + (storedFee > 0 ? storedFee : Number(r.amount ?? 0) * 0.10);
    }, 0);
    setStats({ events: evts?.length || 0, users: usrs?.length || 0, registrations: regs?.length || 0, revenue, platformRevenue });

    // Monthly chart
    const months: Record<string, number> = {};
    (regs || []).forEach(r => {
      const m = new Date(r.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      months[m] = (months[m] || 0) + 1;
    });
    setMonthlyData(Object.entries(months).slice(-6).map(([name, value]) => ({ name, value })));

    // City chart
    const cities: Record<string, number> = {};
    (evts || []).forEach(e => { cities[e.city] = (cities[e.city] || 0) + 1; });
    setCityData(Object.entries(cities).map(([name, value]) => ({ name, value })));

    setLoading(false);
  };

  const updateEventPlan = async (id: string, plan: string) => {
    await supabase.from('events').update({ plan }).eq('id', id);
    setEvents(prev => prev.map(e => e.id === id ? { ...e, plan } : e));
  };

  const deleteEvent = async (id: string) => {
    await supabase.from('termo_aceites').delete().eq('event_id', id);
    await supabase.from('registrations').delete().eq('event_id', id);
    await supabase.from('favorites').delete().eq('event_id', id);
    await supabase.from('reviews').delete().eq('event_id', id);
    await supabase.from('event_photos').delete().eq('event_id', id);
    await supabase.from('coupons').delete().eq('event_id', id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir evento: ' + error.message); return; }
    setEvents(prev => prev.filter(e => e.id !== id));
    setStats(prev => ({ ...prev, events: prev.events - 1 }));
    toast.success('Evento excluído com sucesso');
    setConfirmDelete(null);
  };

  const updateUserRole = async (id: string, role: string) => {
    await supabase.from('users').update({ role }).eq('id', id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'events', label: 'Eventos' },
    { key: 'users', label: 'Usuários' },
    { key: 'registrations', label: 'Inscrições' },
    { key: 'leo', label: 'LEO — Conversas' },
  ];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0f172a' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 hidden md:flex flex-col" style={{ backgroundColor: '#1e293b', borderRight: '1px solid #334155' }}>
        <div className="p-5 border-b" style={{ borderColor: '#334155' }}>
          <img src="/images/logo-022runners.png" alt="022 RUNNER" className="h-10 w-auto object-contain" />
          <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>Painel Admin</p>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: tab === t.key ? '#C9A84C' : 'transparent', color: tab === t.key ? '#fff' : '#94a3b8' }}>
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {/* Mobile tabs */}
        <div className="md:hidden flex gap-1 p-3" style={{ backgroundColor: '#1e293b' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-lg text-xs font-medium"
              style={{ backgroundColor: tab === t.key ? '#C9A84C' : '#334155', color: '#fff' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
            </div>
          ) : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: <Calendar size={20} />, label: 'Eventos', value: stats.events, color: '#C9A84C' },
                      { icon: <Users size={20} />, label: 'Usuários', value: stats.users, color: '#C9A84C' },
                      { icon: <Award size={20} />, label: 'Inscrições', value: stats.registrations, color: '#16a34a' },
                      { icon: <TrendingUp size={20} />, label: 'Receita Organizadores', value: `R$ ${stats.revenue.toFixed(0)}`, color: '#7c3aed' },
                      { icon: <DollarSign size={20} />, label: 'Taxa da Plataforma', value: `R$ ${stats.platformRevenue.toFixed(0)}`, color: '#16a34a' },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#1e293b' }}>
                        <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}</div>
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                        <p className="text-sm" style={{ color: '#94a3b8' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl p-5" style={{ backgroundColor: '#1e293b' }}>
                      <h3 className="font-semibold text-white mb-4">Inscrições por Mês</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData}>
                          <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#fff' }} />
                          <Bar dataKey="value" fill="#C9A84C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="rounded-xl p-5" style={{ backgroundColor: '#1e293b' }}>
                      <h3 className="font-semibold text-white mb-4">Eventos por Cidade</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={cityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                            {cityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* EVENTS */}
              {tab === 'events' && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white">Eventos</h1>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: '#0f172a' }}>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Evento', 'Cidade', 'Data', 'Status', 'Plano', 'Ações'].map(h => (
                            <th key={h} className="px-4 py-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(e => (
                          <tr key={e.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-4 py-3 text-white font-medium">{e.title}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{e.city}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-green-900 text-green-300">{e.status}</span></td>
                            <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[#1A1A1A] text-amber-300">{e.plan}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => updateEventPlan(e.id, 'featured')} className="text-xs px-2 py-1 rounded bg-yellow-700 text-white hover:bg-yellow-600" title="Destacar"><Star size={12} /></button>
                                <button onClick={() => updateEventPlan(e.id, 'premium')} className="text-xs px-2 py-1 rounded bg-purple-700 text-white hover:bg-purple-600" title="Premium"><Award size={12} /></button>
                                <button onClick={() => setConfirmDelete({ id: e.id, title: e.title })} className="text-xs px-2 py-1 rounded bg-red-800 text-white hover:bg-red-700" title="Excluir"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* USERS */}
              {tab === 'users' && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white">Usuários</h1>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: '#0f172a' }}>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Nome', 'Email', 'Papel', 'Eventos', 'Inscrições', 'Ações'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => {
                          const userEvents = events.filter(e => e.organizer_id === u.id).length;
                          const userRegs = registrations.filter(r => r.user_id === u.id).length;
                          return (
                          <tr key={u.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{u.email}</td>
                            <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[#1A1A1A] text-amber-300">{u.role}</span></td>
                            <td className="px-4 py-3 text-center font-bold" style={{ color: '#C9A84C' }}>{userEvents > 0 ? userEvents : '—'}</td>
                            <td className="px-4 py-3 text-center" style={{ color: '#94a3b8' }}>{userRegs > 0 ? userRegs : '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => updateUserRole(u.id, 'organizer')} className="text-xs px-2 py-1 rounded bg-green-800 text-white hover:bg-green-700" title="Promover a organizador"><Shield size={12} /></button>
                                <button onClick={() => updateUserRole(u.id, 'blocked')} className="text-xs px-2 py-1 rounded bg-red-900 text-white hover:bg-red-800" title="Bloquear"><XCircle size={12} /></button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REGISTRATIONS */}
              {tab === 'registrations' && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white">Inscrições</h1>
                  <div className="rounded-xl overflow-x-auto" style={{ backgroundColor: '#1e293b' }}>
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: '#0f172a' }}>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Atleta', 'Evento', 'Valor', 'Status', 'Data'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.slice(0, 100).map(r => {
                          const evtTitle = events.find(e => e.id === r.event_id)?.title || '—';
                          return (
                          <tr key={r.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{evtTitle}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>R$ {Number(r.amount).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'confirmed' || r.status === 'paid' ? 'bg-green-900 text-green-300' : r.status === 'cancelled' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* LEO CONVERSATIONS */}
              {tab === 'leo' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MessageCircle size={22} style={{ color: '#C9A84C' }} /> LEO — Conversas</h1>
                    <span className="text-sm" style={{ color: '#94a3b8' }}>{leoTotal} conversas no total</span>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: '#0f172a' }}>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Data/Hora', 'Pergunta', 'Resposta', 'Página'].map(h => (
                            <th key={h} className="px-4 py-3 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {leoLoading ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#94a3b8' }}>Carregando...</td></tr>
                        ) : leoConversations.length === 0 ? (
                          <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: '#94a3b8' }}>Nenhuma conversa registrada ainda.</td></tr>
                        ) : leoConversations.map(c => {
                          const isExpanded = leoExpanded === c.id;
                          const answer = String(c.answer || '');
                          const truncated = answer.length > 100 && !isExpanded ? `${answer.slice(0, 100)}...` : answer;
                          return (
                            <tr key={c.id} style={{ borderTop: '1px solid #334155' }}>
                              <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: '#94a3b8' }}>{new Date(c.created_at).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-3 text-white">{c.question}</td>
                              <td className="px-4 py-3" style={{ color: '#94a3b8' }}>
                                {truncated}
                                {answer.length > 100 && (
                                  <button
                                    onClick={() => setLeoExpanded(isExpanded ? null : c.id)}
                                    className="ml-2 text-xs font-medium hover:underline"
                                    style={{ color: '#C9A84C' }}
                                  >
                                    {isExpanded ? 'ver menos' : 'ver mais'}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{c.page_url || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {leoTotal > LEO_PAGE_SIZE && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setLeoPage(p => Math.max(0, p - 1))}
                        disabled={leoPage === 0}
                        className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-40"
                        style={{ backgroundColor: '#334155', color: '#fff' }}
                      >
                        Anterior
                      </button>
                      <span className="text-sm" style={{ color: '#94a3b8' }}>
                        Página {leoPage + 1} de {Math.ceil(leoTotal / LEO_PAGE_SIZE)}
                      </span>
                      <button
                        onClick={() => setLeoPage(p => (p + 1) * LEO_PAGE_SIZE < leoTotal ? p + 1 : p)}
                        disabled={(leoPage + 1) * LEO_PAGE_SIZE >= leoTotal}
                        className="text-sm px-3 py-1.5 rounded-lg disabled:opacity-40"
                        style={{ backgroundColor: '#334155', color: '#fff' }}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal confirmação exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: '#1e293b', border: '1px solid #dc2626' }}>
            <h3 className="text-lg font-bold text-white">Excluir Evento</h3>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Tem certeza que deseja excluir o evento <span className="text-white font-medium">"{confirmDelete.title}"</span>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#334155', color: '#94a3b8' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteEvent(confirmDelete.id)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#dc2626', color: '#fff' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
