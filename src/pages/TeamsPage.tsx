import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Users, Plus, Trophy } from 'lucide-react';

export function TeamsPage() {
  const { user, isAuthenticated } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', city: '' });

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    const { data } = await supabase.from('teams').select('*, captain:captain_id(name)').order('created_at', { ascending: false });
    setTeams(data || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Informe o nome da equipe.'); return; }
    const { error } = await supabase.from('teams').insert({ ...form, captain_id: user!.id });
    if (error) toast.error('Erro ao criar equipe.');
    else { toast.success('Equipe criada!'); setCreating(false); setForm({ name: '', description: '', city: '' }); loadTeams(); }
  };

  const handleJoin = async (teamId: string) => {
    const { error } = await supabase.from('team_members').insert({ team_id: teamId, user_id: user!.id });
    if (error?.code === '23505') toast.error('Você já faz parte desta equipe.');
    else if (error) toast.error('Erro ao entrar na equipe.');
    else toast.success('Você entrou na equipe!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-8">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2"><Users size={28} style={{ color: '#C9A84C' }} /> Equipes</h1>
            <p className="text-gray-500 mt-1">Junte-se ou crie uma equipe esportiva</p>
          </div>
          {isAuthenticated && (
            <button onClick={() => setCreating(c => !c)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: '#C9A84C', color: '#000' }}>
              <Plus size={16} /> Criar Equipe
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {creating && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Nova Equipe</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome da equipe *" />
              </div>
              <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm" placeholder="Cidade" />
              <div className="col-span-2">
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Descrição" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => setCreating(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ backgroundColor: '#C9A84C', color: '#000' }}>Criar</button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-3 opacity-20" />
            <p>Nenhuma equipe cadastrada ainda.</p>
          </div>
        ) : teams.map(team => (
          <div key={team.id} className="bg-white rounded-xl border shadow-sm p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
              style={{ backgroundColor: '#C9A84C', color: '#000' }}>
              {team.logo_url ? <img src={team.logo_url} alt="" className="w-full h-full object-cover rounded-xl" /> : team.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">{team.name}</h3>
              {team.city && <p className="text-sm text-gray-400">{team.city}</p>}
              {team.description && <p className="text-sm text-gray-600 mt-0.5 line-clamp-1">{team.description}</p>}
              <p className="text-xs text-gray-400 mt-1">Capitão: {team.captain?.name || '—'}</p>
            </div>
            {isAuthenticated && team.captain_id !== user?.id && (
              <button onClick={() => handleJoin(team.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border-2 flex-shrink-0"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                <Trophy size={14} className="inline mr-1" /> Entrar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
