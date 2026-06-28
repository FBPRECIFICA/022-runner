import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Camera, Save, LogOut, Trash2 } from 'lucide-react';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', city: '', bio: '', birthdate: '', cpf: '' });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('users').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) setForm({ name: data.name || '', phone: data.phone || '', city: data.city || '', bio: data.bio || '', birthdate: data.birthdate || '', cpf: data.cpf || '' });
      if (data?.avatar_url) setAvatar(data.avatar_url);
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatar(data.publicUrl);
      await supabase.from('users').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      toast.success('Foto atualizada!');
    } else {
      toast.error('Erro ao fazer upload da foto.');
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({
      name: form.name, phone: form.phone, city: form.city, bio: form.bio, birthdate: form.birthdate || null, cpf: form.cpf || null,
    }).eq('id', user.id);
    if (error) toast.error('Erro ao salvar.');
    else toast.success('Perfil atualizado!');
    setSaving(false);
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) { toast.error('Senha deve ter ao menos 6 caracteres.'); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error('Erro ao alterar senha.');
    else { toast.success('Senha alterada!'); setNewPassword(''); }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) return;
    await supabase.from('users').delete().eq('id', user!.id);
    await logout();
    navigate('/');
  };

  const initials = user?.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="h-36 bg-gradient-to-br" style={{ background: 'linear-gradient(135deg, #000, #1a1a1a)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9A84C, #FFD700, #C9A84C)' }} />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Avatar */}
        <div className="flex items-end gap-4 -mt-16 mb-6">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-white flex items-center justify-center text-white text-3xl font-bold overflow-hidden"
              style={{ background: avatar ? 'transparent' : 'linear-gradient(135deg, #C9A84C, #B8962E)' }}>
              {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : initials}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow"
              style={{ backgroundColor: '#C9A84C' }}>
              {uploading ? <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                : <Camera size={14} color="#000" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div className="pb-2">
            <h1 className="text-xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-5 pb-8">
          {/* Dados pessoais */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-4">Dados Pessoais</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Nome completo', key: 'name', type: 'text' },
                { label: 'Telefone', key: 'phone', type: 'tel' },
                { label: 'CPF', key: 'cpf', type: 'text' },
                { label: 'Cidade', key: 'city', type: 'text' },
                { label: 'Data de Nascimento', key: 'birthdate', type: 'date' },
              ].map(f => (
                <div key={f.key} className={f.key === 'name' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-gray-500 font-medium mb-1">{f.label}</label>
                  <input type={f.type} value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: '#d1d5db' }} />
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 font-medium mb-1">Bio</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: '#d1d5db' }} placeholder="Conte um pouco sobre você..." />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
              style={{ backgroundColor: '#C9A84C', color: '#000' }}>
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>

          {/* Alterar senha */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3">Alterar Senha</h2>
            <div className="flex gap-2">
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#d1d5db' }} placeholder="Nova senha (mín. 6 caracteres)" />
              <button onClick={handlePasswordChange}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#C9A84C', color: '#000' }}>
                Alterar
              </button>
            </div>
          </div>

          {/* Zona de perigo */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-5">
            <h2 className="font-bold text-red-700 mb-1">Zona de Perigo</h2>
            <p className="text-red-600 text-sm mb-3">Estas ações são irreversíveis.</p>
            <div className="flex gap-2">
              <button onClick={() => { logout(); navigate('/'); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                <LogOut size={14} /> Sair da conta
              </button>
              <button onClick={handleDeleteAccount}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                <Trash2 size={14} /> Excluir conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
