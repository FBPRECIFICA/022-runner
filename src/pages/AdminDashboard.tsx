import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Users, Calendar, TrendingUp, Award, Star, Shield, XCircle, Trash2, DollarSign, MessageCircle, X, Eye, BarChart3, Download, Briefcase } from 'lucide-react';

const COLORS = ['#C9A84C', '#C9A84C', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#be185d'];
const LEO_PAGE_SIZE = 20;

type Tab = 'overview' | 'events' | 'users' | 'registrations' | 'leo' | 'organizers';

function statusLabel(status: string) {
  if (status === 'paid' || status === 'confirmed') return 'Pago';
  if (status === 'pending' || status === 'awaiting_payment') return 'Aguardando Pagamento';
  if (status === 'cancelled') return 'Cancelado';
  return status;
}

function statusBadgeClass(status: string) {
  if (status === 'paid' || status === 'confirmed') return 'bg-green-900 text-green-300';
  if (status === 'cancelled') return 'bg-red-900 text-red-300';
  return 'bg-yellow-900 text-yellow-300';
}

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
  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [orgMaisDadosEventId, setOrgMaisDadosEventId] = useState<string | null>(null);
  const [selectedEventPreview, setSelectedEventPreview] = useState<any | null>(null);
  const [eventCoupons, setEventCoupons] = useState<any[]>([]);
  const [loadingEventCoupons, setLoadingEventCoupons] = useState(false);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    if (tab === 'leo') loadLeoConversations(leoPage);
  }, [tab, leoPage]);

  useEffect(() => {
    if (!selectedEventPreview) { setEventCoupons([]); return; }
    loadEventCoupons(selectedEventPreview.id);
  }, [selectedEventPreview]);

  const loadEventCoupons = async (eventId: string) => {
    setLoadingEventCoupons(true);
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .or(`event_id.eq.${eventId},event_id.is.null`)
      .eq('active', true);
    setEventCoupons(data || []);
    setLoadingEventCoupons(false);
  };

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
    // Mesma lógica do OrganizerDashboard: total bruto = soma de base_amount (fallback amount),
    // taxa plataforma = SEMPRE 10% do total bruto (nunca soma o platform_fee gravado por linha,
    // que pode estar zerado em inscrições antigas migradas antes do modelo de taxa separada).
    const revenue = paidRegs.reduce((a, r) => a + Number(r.base_amount ?? r.amount ?? 0), 0);
    const platformRevenue = revenue * 0.10;
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

  const exportEventExcel = (event: any) => {
    const evtRegs = registrations
      .filter(r => r.event_id === event.id)
      .sort((a, b) => (a.registration_number || '').localeCompare(b.registration_number || ''));
    const rows = evtRegs.map(r => ({
      'Nº Peito': r.registration_number,
      'Nome Completo': r.full_name || r.name,
      'CPF': r.cpf,
      'Email': r.email,
      'Telefone': r.phone,
      'Categoria': r.distance_name,
      'Distância': r.distance_name,
      'Tamanho Camiseta': r.shirt_size,
      'Status Pagamento': statusLabel(r.status),
      'Data Inscrição': new Date(r.created_at).toLocaleDateString('pt-BR'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `inscritos-${event.slug}-${date}.xlsx`);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'events', label: 'Eventos' },
    { key: 'organizers', label: 'Organizadores' },
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { icon: <Calendar size={20} />, label: 'Eventos', value: stats.events, color: '#C9A84C' },
                      { icon: <Users size={20} />, label: 'Usuários', value: stats.users, color: '#C9A84C' },
                      { icon: <Award size={20} />, label: 'Inscrições', value: stats.registrations, color: '#16a34a' },
                      { icon: <TrendingUp size={20} />, label: 'Total Bruto Inscrições', value: `R$ ${stats.revenue.toFixed(0)}`, color: '#C9A84C' },
                      { icon: <DollarSign size={20} />, label: 'Taxa 022Runners (10%)', value: `R$ ${stats.platformRevenue.toFixed(0)}`, color: '#f87171' },
                      { icon: <TrendingUp size={20} />, label: 'Est. Repasse*', value: `R$ ${(stats.revenue - stats.platformRevenue - stats.revenue * 0.015).toFixed(0)}`, color: '#22c55e' },
                    ].map((s, i) => (
                      <div key={i} className="rounded-xl p-4" style={{ backgroundColor: '#1e293b' }}>
                        <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>{s.icon}</div>
                        <p className="text-2xl font-bold text-white">{s.value}</p>
                        <p className="text-sm" style={{ color: '#94a3b8' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs -mt-2" style={{ color: '#64748b' }}>
                    * Valor estimado. Taxa Asaas varia: PIX 0,99% | Cartão 2,99%
                  </p>

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

                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <div className="px-5 pt-5 pb-3">
                      <h3 className="font-semibold text-white">Comissão 022Runners por Evento</h3>
                      <p className="text-xs mt-1" style={{ color: '#64748b' }}>10% cobrado do atleta na inscrição — lucro real da plataforma, evento a evento.</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: '#0f172a' }}>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Evento', 'Organizador', 'Receita Bruta', 'Comissão (10%)'].map(h => (
                            <th key={h} className="px-4 py-2 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {events.map(e => {
                          const evRegs = registrations.filter(r => r.event_id === e.id);
                          const evRevenue = evRegs.filter(r => r.status === 'paid' || r.status === 'confirmed').reduce((s, r) => s + Number(r.base_amount ?? r.amount ?? 0), 0);
                          const evComissao = evRevenue * 0.10;
                          const organizerName = users.find(u => u.id === e.organizer_id)?.name || '—';
                          return (
                            <tr key={e.id} style={{ borderTop: '1px solid #334155' }}>
                              <td className="px-4 py-2 text-white">{e.title}</td>
                              <td className="px-4 py-2" style={{ color: '#94a3b8' }}>{organizerName}</td>
                              <td className="px-4 py-2 text-green-400">R$ {evRevenue.toFixed(2).replace('.', ',')}</td>
                              <td className="px-4 py-2 font-semibold text-purple-400">R$ {evComissao.toFixed(2).replace('.', ',')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                                <a href={`/evento/${e.slug}`} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 rounded bg-blue-800 text-white hover:bg-blue-700 flex items-center gap-1" title="Ver como Atleta"><Eye size={12} /> Atleta</a>
                                <button onClick={() => setSelectedEventPreview(e)} className="text-xs px-2 py-1 rounded bg-indigo-800 text-white hover:bg-indigo-700 flex items-center gap-1" title="Ver como Organizador"><BarChart3 size={12} /> Org.</button>
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

              {/* ORGANIZERS */}
              {tab === 'organizers' && (() => {
                const organizerRows = users.filter(u => u.role === 'organizer' || events.some(e => e.organizer_id === u.id));
                return (
                  <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Briefcase size={22} style={{ color: '#C9A84C' }} /> Organizadores</h1>
                    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                      <table className="w-full text-sm">
                        <thead style={{ backgroundColor: '#0f172a' }}>
                          <tr className="text-left" style={{ color: '#94a3b8' }}>
                            {['Nome', 'Email', 'Eventos', 'Inscrições', 'Receita Bruta', 'Ações'].map(h => (
                              <th key={h} className="px-4 py-3 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {organizerRows.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#94a3b8' }}>Nenhum organizador cadastrado ainda.</td></tr>
                          ) : organizerRows.map(u => {
                            const orgEvents = events.filter(e => e.organizer_id === u.id);
                            const orgEventIds = orgEvents.map(e => e.id);
                            const orgRegs = registrations.filter(r => orgEventIds.includes(r.event_id));
                            const orgPaidRegs = orgRegs.filter(r => r.status === 'paid' || r.status === 'confirmed');
                            const orgRevenue = orgPaidRegs.reduce((s, r) => s + Number(r.base_amount ?? r.amount ?? 0), 0);
                            return (
                              <tr key={u.id} style={{ borderTop: '1px solid #334155' }}>
                                <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                                <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{u.email}</td>
                                <td className="px-4 py-3 text-center font-bold" style={{ color: '#C9A84C' }}>{orgEvents.length}</td>
                                <td className="px-4 py-3 text-center" style={{ color: '#94a3b8' }}>{orgRegs.filter(r => r.status !== 'cancelled').length}</td>
                                <td className="px-4 py-3 font-medium text-green-400">R$ {orgRevenue.toFixed(2).replace('.', ',')}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => setSelectedOrganizerId(u.id)}
                                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                                    style={{ backgroundColor: '#C9A84C', color: '#fff' }}
                                  >
                                    Ver Painel
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

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

      {/* Modal Visão do Organizador */}
      {selectedOrganizerId && (() => {
        const org = users.find(u => u.id === selectedOrganizerId);
        const orgEvents = events.filter(e => e.organizer_id === selectedOrganizerId);
        const orgEventIds = orgEvents.map(e => e.id);
        const orgRegs = registrations.filter(r => orgEventIds.includes(r.event_id));
        const orgPaidRegs = orgRegs.filter(r => r.status === 'paid' || r.status === 'confirmed');
        const totalBruto = orgPaidRegs.reduce((s, r) => s + Number(r.base_amount ?? r.amount ?? 0), 0);
        const estimado = totalBruto - totalBruto * 0.015;
        const recentRegs = [...orgRegs]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 20);

        const effectiveMdEventId = orgEvents.some(e => e.id === orgMaisDadosEventId) ? orgMaisDadosEventId : (orgEvents[0]?.id || null);
        const mdRegs = effectiveMdEventId ? registrations.filter(r => r.event_id === effectiveMdEventId && r.status !== 'cancelled') : [];
        const mdConfirmed = mdRegs.filter(r => r.status === 'paid' || r.status === 'confirmed');
        const mdPending = mdRegs.filter(r => r.status === 'pending' || r.status === 'awaiting_payment');

        const genderLabelsMd: Record<string, string> = { M: 'Masculino', F: 'Feminino', O: 'Outro' };
        const genderColorsMd: Record<string, string> = { M: '#3B82F6', F: '#EC4899', O: '#9CA3AF' };
        const genderCountsMd = mdRegs.reduce((acc: Record<string, number>, r) => {
          if (r.gender) acc[r.gender] = (acc[r.gender] || 0) + 1;
          return acc;
        }, {});
        const genderDataMd = Object.entries(genderCountsMd).map(([g, count]) => ({
          name: genderLabelsMd[g] || g,
          value: count,
          color: genderColorsMd[g] || '#C9A84C',
        }));

        const calcAgeMd = (birthDate: string) => {
          const today = new Date();
          const [y, m, d] = birthDate.split('-').map(Number);
          let age = today.getFullYear() - y;
          if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
          return age;
        };
        const agesMd = mdRegs.filter(r => r.birth_date).map(r => calcAgeMd(r.birth_date));
        const avgAgeMd = agesMd.length ? Math.round(agesMd.reduce((s, a) => s + a, 0) / agesMd.length) : null;
        const minAgeMd = agesMd.length ? Math.min(...agesMd) : null;
        const maxAgeMd = agesMd.length ? Math.max(...agesMd) : null;

        const lastRegsMd = [...mdRegs]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} onClick={() => setSelectedOrganizerId(null)}>
            <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#334155' }}>
                <h3 className="text-lg font-bold text-white">Visão do Organizador: {org?.name}</h3>
                <button onClick={() => setSelectedOrganizerId(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={20} className="text-white" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#0f172a' }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: '#C9A84C' }}><DollarSign size={16} /><span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Total Bruto</span></div>
                    <p className="text-lg font-bold" style={{ color: '#C9A84C' }}>R$ {totalBruto.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#0f172a' }}>
                    <div className="flex items-center gap-2 mb-1 text-green-400"><TrendingUp size={16} /><span className="text-xs font-medium" style={{ color: '#94a3b8' }}>Est. a Receber*</span></div>
                    <p className="text-lg font-bold text-green-400">R$ {estimado.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <p className="text-xs -mt-4" style={{ color: '#64748b' }}>* Valor estimado. A taxa de 10% da plataforma é paga pelo atleta e não desconta a receita do organizador. O valor final pode variar, pois toda a parte financeira é controlada pelo Asaas, sistema financeiro independente.</p>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Eventos ({orgEvents.length})</h4>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Evento', 'Data', 'Inscritos', 'Receita'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {orgEvents.length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-4 text-center" style={{ color: '#94a3b8' }}>Nenhum evento.</td></tr>
                        ) : orgEvents.map(ev => {
                          const evRegs = registrations.filter(r => r.event_id === ev.id);
                          const evRevenue = evRegs.filter(r => r.status === 'paid' || r.status === 'confirmed').reduce((s, r) => s + Number(r.base_amount ?? r.amount ?? 0), 0);
                          return (
                            <tr key={ev.id} style={{ borderTop: '1px solid #334155' }}>
                              <td className="px-3 py-2 text-white">{ev.title}</td>
                              <td className="px-3 py-2" style={{ color: '#94a3b8' }}>{new Date(ev.date).toLocaleDateString('pt-BR')}</td>
                              <td className="px-3 py-2 text-center" style={{ color: '#94a3b8' }}>{evRegs.filter(r => r.status !== 'cancelled').length}</td>
                              <td className="px-3 py-2 text-green-400">R$ {evRevenue.toFixed(2).replace('.', ',')}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">Mais Dados</h4>
                    {orgEvents.length > 1 && (
                      <select
                        value={effectiveMdEventId || ''}
                        onChange={e => setOrgMaisDadosEventId(e.target.value || null)}
                        className="text-xs rounded-lg px-2 py-1"
                        style={{ backgroundColor: '#0f172a', color: '#e2e8f0', border: '1px solid #334155' }}
                      >
                        {orgEvents.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                      </select>
                    )}
                  </div>
                  {orgEvents.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#64748b' }}>Nenhum evento.</p>
                  ) : mdRegs.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: '#64748b' }}>Nenhum inscrito neste evento ainda.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="rounded-xl p-3" style={{ backgroundColor: '#0f172a' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Confirmados</p>
                          <p className="text-xl font-bold text-green-400">{mdConfirmed.length}</p>
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: '#0f172a' }}>
                          <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Pendentes</p>
                          <p className="text-xl font-bold text-yellow-400">{mdPending.length}</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-3 mb-3">
                        <div className="rounded-xl p-3" style={{ backgroundColor: '#0f172a' }}>
                          <p className="text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Sexo dos Atletas</p>
                          {genderDataMd.length === 0 ? (
                            <p className="text-xs text-center py-6" style={{ color: '#64748b' }}>Sem dados de sexo.</p>
                          ) : (
                            <ResponsiveContainer width="100%" height={160}>
                              <PieChart>
                                <Pie data={genderDataMd} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label>
                                  {genderDataMd.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                </Pie>
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#fff', fontSize: 12 }} />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                        <div className="rounded-xl p-3" style={{ backgroundColor: '#0f172a' }}>
                          <p className="text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>Idade dos Atletas</p>
                          {avgAgeMd === null ? (
                            <p className="text-xs text-center py-6" style={{ color: '#64748b' }}>Sem dados de idade.</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 pt-2">
                              <div className="text-center">
                                <p className="text-lg font-bold" style={{ color: '#C9A84C' }}>{avgAgeMd}</p>
                                <p className="text-[10px]" style={{ color: '#94a3b8' }}>Idade média</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-blue-400">{minAgeMd}</p>
                                <p className="text-[10px]" style={{ color: '#94a3b8' }}>Mais jovem</p>
                              </div>
                              <div className="text-center">
                                <p className="text-lg font-bold text-purple-400">{maxAgeMd}</p>
                                <p className="text-[10px]" style={{ color: '#94a3b8' }}>Mais experiente</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left" style={{ color: '#94a3b8' }}>
                              {['Atleta', 'Nº Peito', 'Status', 'Data'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {lastRegsMd.map(r => {
                              const isPaid = r.status === 'paid' || r.status === 'confirmed';
                              return (
                                <tr key={r.id} style={{ borderTop: '1px solid #334155' }}>
                                  <td className="px-3 py-2 text-white">{r.name}</td>
                                  <td className="px-3 py-2 font-mono" style={{ color: '#C9A84C' }}>{r.registration_number}</td>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPaid ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                      {isPaid ? 'Confirmado' : 'Pendente'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs" style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Inscrições Recentes</h4>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Atleta', 'Evento', 'Status', 'Data'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {recentRegs.length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-4 text-center" style={{ color: '#94a3b8' }}>Nenhuma inscrição.</td></tr>
                        ) : recentRegs.map(r => (
                          <tr key={r.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-3 py-2 text-white">{r.name}</td>
                            <td className="px-3 py-2" style={{ color: '#94a3b8' }}>{orgEvents.find(e => e.id === r.event_id)?.title || '—'}</td>
                            <td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                            <td className="px-3 py-2 text-xs" style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Ver como Organizador (evento específico) */}
      {selectedEventPreview && (() => {
        const ev = selectedEventPreview;
        const evRegs = registrations.filter(r => r.event_id === ev.id);
        const evPaidRegs = evRegs.filter(r => r.status === 'paid' || r.status === 'confirmed');
        const bruto = evPaidRegs.reduce((s, r) => s + Number(r.base_amount ?? r.amount ?? 0), 0);
        const estimado = bruto - bruto * 0.015;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }} onClick={() => setSelectedEventPreview(null)}>
            <div className="w-full max-w-3xl max-h-[90vh] rounded-2xl flex flex-col" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#334155' }}>
                <h3 className="text-lg font-bold text-white">Painel do Organizador: {ev.title}</h3>
                <button onClick={() => setSelectedEventPreview(null)} className="p-1 rounded-lg hover:bg-white/10"><X size={20} className="text-white" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#0f172a' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Bruto</p>
                    <p className="text-lg font-bold" style={{ color: '#C9A84C' }}>R$ {bruto.toFixed(2).replace('.', ',')}</p>
                  </div>
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#0f172a' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>Est. a Receber*</p>
                    <p className="text-lg font-bold text-green-400">R$ {estimado.toFixed(2).replace('.', ',')}</p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: '#64748b' }}>* Valor estimado. A taxa de 10% da plataforma é paga pelo atleta e não desconta a receita do organizador. O valor final pode variar, pois toda a parte financeira é controlada pelo Asaas, sistema financeiro independente.</p>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">Cupons Ativos</h4>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Código', 'Desconto', 'Usos'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {loadingEventCoupons ? (
                          <tr><td colSpan={3} className="px-3 py-4 text-center" style={{ color: '#94a3b8' }}>Carregando...</td></tr>
                        ) : eventCoupons.length === 0 ? (
                          <tr><td colSpan={3} className="px-3 py-4 text-center" style={{ color: '#94a3b8' }}>Nenhum cupom ativo.</td></tr>
                        ) : eventCoupons.map(c => (
                          <tr key={c.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-3 py-2 font-mono font-bold text-white">{c.code}</td>
                            <td className="px-3 py-2" style={{ color: '#94a3b8' }}>{c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2).replace('.', ',')}`}</td>
                            <td className="px-3 py-2" style={{ color: '#94a3b8' }}>{c.current_uses ?? 0}{c.max_uses ? ` de ${c.max_uses}` : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white">Inscrições ({evRegs.length})</h4>
                    <button
                      onClick={() => exportEventExcel(ev)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5"
                      style={{ backgroundColor: '#16a34a', color: '#fff' }}
                    >
                      <Download size={13} /> Exportar Excel
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden overflow-x-auto" style={{ backgroundColor: '#0f172a' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Nº Peito', 'Nome', 'Categoria', 'Status'].map(h => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {evRegs.length === 0 ? (
                          <tr><td colSpan={4} className="px-3 py-4 text-center" style={{ color: '#94a3b8' }}>Nenhuma inscrição.</td></tr>
                        ) : evRegs.map(r => (
                          <tr key={r.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-3 py-2 font-mono font-bold" style={{ color: '#C9A84C' }}>{r.registration_number}</td>
                            <td className="px-3 py-2 text-white">{r.name}</td>
                            <td className="px-3 py-2" style={{ color: '#94a3b8' }}>{r.distance_name}</td>
                            <td className="px-3 py-2"><span className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(r.status)}`}>{statusLabel(r.status)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
