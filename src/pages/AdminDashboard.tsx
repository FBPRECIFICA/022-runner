import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Users, Calendar, TrendingUp, Award, Star, Shield, CheckCircle, XCircle } from 'lucide-react';

const COLORS = ['#C9A84C', '#C9A84C', '#16a34a', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#be185d'];

type Tab = 'overview' | 'events' | 'users' | 'registrations';

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState({ events: 0, users: 0, registrations: 0, revenue: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [cityData, setCityData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [{ data: evts }, { data: usrs }, { data: regs }] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*').order('created_at', { ascending: false }),
      supabase.from('registrations').select('*').order('created_at', { ascending: false }),
    ]);
    setEvents(evts || []);
    setUsers(usrs || []);
    setRegistrations(regs || []);
    const revenue = (regs || []).filter(r => r.status === 'confirmed').reduce((a, r) => a + Number(r.amount || 0), 0);
    setStats({ events: evts?.length || 0, users: usrs?.length || 0, registrations: regs?.length || 0, revenue });

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

  const updateUserRole = async (id: string, role: string) => {
    await supabase.from('users').update({ role }).eq('id', id);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Visão Geral' },
    { key: 'events', label: 'Eventos' },
    { key: 'users', label: 'Usuários' },
    { key: 'registrations', label: 'Inscrições' },
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
                      { icon: <TrendingUp size={20} />, label: 'Receita', value: `R$ ${stats.revenue.toFixed(0)}`, color: '#7c3aed' },
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
                          {['Nome', 'Email', 'Papel', 'Ações'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(u => (
                          <tr key={u.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{u.email}</td>
                            <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-[#1A1A1A] text-amber-300">{u.role}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button onClick={() => updateUserRole(u.id, 'organizer')} className="text-xs px-2 py-1 rounded bg-green-800 text-white hover:bg-green-700" title="Promover a organizador"><Shield size={12} /></button>
                                <button onClick={() => updateUserRole(u.id, 'blocked')} className="text-xs px-2 py-1 rounded bg-red-900 text-white hover:bg-red-800" title="Bloquear"><XCircle size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* REGISTRATIONS */}
              {tab === 'registrations' && (
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-white">Inscrições</h1>
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#1e293b' }}>
                    <table className="w-full text-sm">
                      <thead style={{ backgroundColor: '#0f172a' }}>
                        <tr className="text-left" style={{ color: '#94a3b8' }}>
                          {['Nº', 'Nome', 'Distância', 'Valor', 'Status', 'Data'].map(h => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {registrations.slice(0, 50).map(r => (
                          <tr key={r.id} style={{ borderTop: '1px solid #334155' }}>
                            <td className="px-4 py-3 font-mono text-xs" style={{ color: '#C9A84C' }}>{r.registration_number}</td>
                            <td className="px-4 py-3 text-white">{r.name}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{r.distance_name}</td>
                            <td className="px-4 py-3" style={{ color: '#94a3b8' }}>R$ {Number(r.amount).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${r.status === 'confirmed' ? 'bg-green-900 text-green-300' : r.status === 'cancelled' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
