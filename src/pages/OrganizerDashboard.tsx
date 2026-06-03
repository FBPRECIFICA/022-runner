import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LAGOS_REGION_CITIES } from '../types';
import { Plus, Calendar, Users, TrendingUp, Image, Trash2, Eye, Edit } from 'lucide-react';

interface EventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  city: string;
  location: string;
  max_participants: string;
  registration_deadline: string;
  distances: { name: string; price: string }[];
}

const emptyForm: EventForm = {
  title: '',
  description: '',
  date: '',
  time: '',
  city: '',
  location: '',
  max_participants: '',
  registration_deadline: '',
  distances: [{ name: '5km', price: '' }],
};

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function OrganizerDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'eventos' | 'criar'>('eventos');
  const [events, setEvents] = useState<any[]>([]);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });
    setEvents(data || []);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Máximo 5 fotos por evento.');
      return;
    }
    setPhotos(prev => [...prev, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const addDistance = () => {
    setForm(prev => ({ ...prev, distances: [...prev.distances, { name: '', price: '' }] }));
  };

  const removeDistance = (index: number) => {
    setForm(prev => ({ ...prev, distances: prev.distances.filter((_, i) => i !== index) }));
  };

  const updateDistance = (index: number, field: 'name' | 'price', value: string) => {
    setForm(prev => {
      const distances = [...prev.distances];
      distances[index] = { ...distances[index], [field]: value };
      return { ...prev, distances };
    });
  };

  const openEdit = (event: any) => {
    const dateObj = new Date(event.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().slice(0, 5);
    const distances = (event.distances || []).map((d: any) => ({
      name: d.name || '',
      price: String(d.price || ''),
    }));
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: dateStr,
      time: timeStr,
      city: event.city || '',
      location: event.location || '',
      max_participants: event.max_participants ? String(event.max_participants) : '',
      registration_deadline: event.registration_deadline
        ? new Date(event.registration_deadline).toISOString().split('T')[0]
        : '',
      distances: distances.length > 0 ? distances : [{ name: '5km', price: '' }],
    });
    setEditingEventId(event.id);
    setPhotos([]);
    setPhotoPreviews([]);
    setSuccess('');
    setError('');
    setTab('criar');
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.title || !form.date || !form.city || !form.location) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    try {
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('event-photos')
          .upload(fileName, photo);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
          photoUrls.push(urlData.publicUrl);
        }
      }

      const distances = form.distances.filter(d => d.name && d.price).map(d => ({
        name: d.name,
        price: parseFloat(d.price),
      }));
      const prices = distances.map(d => d.price);
      const payload: any = {
        title: form.title,
        description: form.description,
        date: `${form.date}T${form.time || '07:00'}:00`,
        city: form.city,
        location: form.location,
        distances,
        prices,
        max_participants: parseInt(form.max_participants) || null,
        registration_deadline: form.registration_deadline || null,
      };

      if (photoUrls.length > 0) {
        payload.photos = photoUrls;
        payload.banner_url = photoUrls[0];
      }

      if (editingEventId) {
        const { error: updateError } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingEventId);
        if (updateError) throw updateError;
        setSuccess('Evento atualizado com sucesso!');
      } else {
        const slug = generateSlug(form.title);
        const { error: insertError } = await supabase.from('events').insert({
          ...payload,
          slug,
          organizer_id: user?.id,
          status: 'published',
          plan: 'free',
          quality_score: photoUrls.length > 0 ? 60 : 30,
        });
        if (insertError) throw insertError;
        setSuccess(`Evento criado! Link: 022runner.com.br/evento/${slug}`);
      }

      setForm(emptyForm);
      setPhotos([]);
      setPhotoPreviews([]);
      setEditingEventId(null);
      loadEvents();
      setTab('eventos');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar evento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Painel do Organizador</h1>
            <p className="text-sm text-gray-500">Olá, {user?.name}</p>
          </div>
          <button
            onClick={() => setTab('criar')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg"><Calendar className="text-blue-600" size={20} /></div>
              <div><p className="text-2xl font-bold">{events.length}</p><p className="text-sm text-gray-500">Eventos</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><Users className="text-green-600" size={20} /></div>
              <div><p className="text-2xl font-bold">0</p><p className="text-sm text-gray-500">Inscritos</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg"><TrendingUp className="text-purple-600" size={20} /></div>
              <div><p className="text-2xl font-bold">R$ 0</p><p className="text-sm text-gray-500">Receita</p></div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('eventos')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'eventos' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>Meus Eventos</button>
          <button onClick={() => setTab('criar')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'criar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}>Criar Evento</button>
        </div>

        {/* Lista de Eventos */}
        {tab === 'eventos' && (
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Nenhum evento criado ainda.</p>
                <button onClick={() => setTab('criar')} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">Criar primeiro evento</button>
              </div>
            ) : events.map(event => (
              <div key={event.id} className="bg-white rounded-xl border p-4 flex items-center gap-4">
                {event.banner_url && <img src={event.banner_url} alt="" className="w-20 h-16 object-cover rounded-lg" />}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.city} · {new Date(event.date).toLocaleDateString('pt-BR')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{event.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                </div>
                <div className="flex gap-2">
                  <a href={`/evento/${event.slug}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-blue-600 border rounded-lg" title="Visualizar"><Eye size={18} /></a>
                  <button onClick={() => openEdit(event)} className="p-2 text-gray-500 hover:text-blue-600 border rounded-lg" title="Editar"><Edit size={18} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Criar Evento */}
        {tab === 'criar' && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold mb-6">{editingEventId ? 'Editar Evento' : 'Criar Novo Evento'}</h2>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
            {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Corrida da Praia 2027" />
                {form.title && <p className="text-xs text-gray-400 mt-1">Link: 022runner.com.br/evento/{generateSlug(form.title)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Largada</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione a cidade</option>
                  {LAGOS_REGION_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local de Largada *</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Praça da Paz" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Participantes</label>
                <input type="number" value={form.max_participants} onChange={e => setForm(p => ({ ...p, max_participants: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Inscrição</label>
                <input type="date" value={form.registration_deadline} onChange={e => setForm(p => ({ ...p, registration_deadline: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Evento</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={4} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descreva o evento, percurso, atrações..." />
              </div>

              {/* Distâncias e Preços */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Distâncias e Preços</label>
                <div className="space-y-2">
                  {form.distances.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={d.name} onChange={e => updateDistance(i, 'name', e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: 5km, 10km, 21km" />
                      <input type="number" value={d.price} onChange={e => updateDistance(i, 'price', e.target.value)}
                        className="w-32 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="R$ preço" />
                      {form.distances.length > 1 && (
                        <button onClick={() => removeDistance(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={addDistance} className="text-blue-600 text-sm hover:underline">+ Adicionar distância</button>
                </div>
              </div>

              {/* Upload de Fotos */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fotos do Evento (máx. 5)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange}
                    className="hidden" id="photo-upload" />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Image size={40} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">Clique ou arraste as fotos aqui</p>
                    <p className="text-gray-400 text-sm">JPG, PNG até 5MB cada</p>
                  </label>
                </div>
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {photoPreviews.map((src, i) => (
                      <div key={i} className="relative">
                        <img src={src} alt="" className="w-full h-20 object-cover rounded-lg" />
                        <button onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                        {i === 0 && <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1 rounded">Capa</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setTab('eventos'); setEditingEventId(null); setForm(emptyForm); }} className="flex-1 border text-gray-600 py-3 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
                {loading ? 'Salvando...' : editingEventId ? '💾 Salvar Alterações' : '🚀 Publicar Evento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
