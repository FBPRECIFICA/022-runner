import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LAGOS_REGION_CITIES } from '../types';
import { Plus, Calendar, Users, TrendingUp, Image, Trash2, Eye, Edit, Download, Upload } from 'lucide-react';
import { RunnerPostsIcon } from '../components/RunnerPostsIcon';
import * as XLSX from 'xlsx';

const EVENT_TYPES = ['Corrida de Rua', 'Trail Run', 'Ciclismo', 'Triathlon', 'Caminhada', 'Outro'];
const KIT_OPTIONS = ['Camiseta', 'Medalha', 'Número de peito', 'Mochila', 'Outros'];

interface Lot { price: string; qty: string; }
interface DistanceWithLots { name: string; lots: Lot[]; }

interface EventForm {
  title: string;
  description: string;
  date: string;
  time: string;
  city: string;
  location: string;
  max_participants: string;
  registration_deadline: string;
  event_type: string;
  kit_items: string[];
  additional_info: string;
  sponsors: { name: string; logo_url: string }[];
  distances: DistanceWithLots[];
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
  event_type: '',
  kit_items: [],
  additional_info: '',
  sponsors: [],
  distances: [{ name: '5km', lots: [{ price: '', qty: '' }] }],
};

function calcScore(form: EventForm, hasPhotos: boolean): number {
  let score = 10;
  if (form.title) score += 15;
  if (form.description && form.description.length > 50) score += 15;
  if (form.date) score += 10;
  if (form.city) score += 5;
  if (form.location) score += 5;
  if (form.max_participants) score += 5;
  if (form.registration_deadline) score += 5;
  if (form.event_type) score += 5;
  if (form.kit_items.length > 0) score += 10;
  if (form.additional_info && form.additional_info.length > 30) score += 5;
  if (form.distances.some(d => d.name && d.lots.some(l => l.price))) score += 5;
  if (hasPhotos) score += 5;
  return Math.min(score, 100);
}

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
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
  const [sponsorUploading, setSponsorUploading] = useState<boolean[]>([]);
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

  const handleSponsorLogoUpload = async (index: number, file: File) => {
    setSponsorUploading(prev => { const next = [...prev]; next[index] = true; return next; });
    try {
      const ext = file.name.split('.').pop();
      const fileName = `sponsor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('event-photos').upload(fileName, file);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('event-photos').getPublicUrl(fileName);
        setForm(p => {
          const sp = [...p.sponsors];
          sp[index] = { ...sp[index], logo_url: urlData.publicUrl };
          return { ...p, sponsors: sp };
        });
      } else {
        setError('Erro ao enviar logo do patrocinador.');
      }
    } catch {
      setError('Erro ao enviar logo do patrocinador.');
    } finally {
      setSponsorUploading(prev => { const next = [...prev]; next[index] = false; return next; });
    }
  };

  const addDistance = () => {
    setForm(prev => ({ ...prev, distances: [...prev.distances, { name: '', lots: [{ price: '', qty: '' }] }] }));
  };

  const removeDistance = (index: number) => {
    setForm(prev => ({ ...prev, distances: prev.distances.filter((_, i) => i !== index) }));
  };

  const updateDistanceName = (index: number, value: string) => {
    setForm(prev => {
      const distances = [...prev.distances];
      distances[index] = { ...distances[index], name: value };
      return { ...prev, distances };
    });
  };

  const updateLot = (di: number, li: number, field: 'price' | 'qty', value: string) => {
    setForm(prev => {
      const distances = prev.distances.map((d, i) => {
        if (i !== di) return d;
        const lots = d.lots.map((l, j) => j === li ? { ...l, [field]: value } : l);
        return { ...d, lots };
      });
      return { ...prev, distances };
    });
  };

  const addLot = (di: number) => {
    setForm(prev => {
      const distances = prev.distances.map((d, i) =>
        i === di && d.lots.length < 3 ? { ...d, lots: [...d.lots, { price: '', qty: '' }] } : d
      );
      return { ...prev, distances };
    });
  };

  const removeLot = (di: number, li: number) => {
    setForm(prev => {
      const distances = prev.distances.map((d, i) =>
        i === di ? { ...d, lots: d.lots.filter((_, j) => j !== li) } : d
      );
      return { ...prev, distances };
    });
  };

  const exportExcel = async (event: any) => {
    const { data } = await supabase.from('registrations').select('*').eq('event_id', event.id);
    const rows = (data || []).map(r => ({
      'Nº Inscrição': r.registration_number,
      'Nome': r.name,
      'CPF': r.cpf,
      'Email': r.email,
      'Telefone': r.phone,
      'Cidade': r.city,
      'Distância': r.distance_name,
      'Tamanho Camiseta': r.shirt_size,
      'Valor': r.amount,
      'Status': r.status,
      'Data Inscrição': new Date(r.created_at).toLocaleDateString('pt-BR'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `inscritos-${event.slug}-${date}.xlsx`);
  };

  const openEdit = (event: any) => {
    const dateObj = new Date(event.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().slice(0, 5);
    const distances = (event.distances || []).map((d: any) => ({
      name: d.name || '',
      lots: d.lots ? d.lots.map((l: any) => ({ price: String(l.price || ''), qty: String(l.qty || '') }))
        : [{ price: String(d.price || ''), qty: '' }],
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
      event_type: event.event_type || '',
      kit_items: event.kit_items || [],
      additional_info: event.additional_info || '',
      sponsors: event.sponsors || [],
      distances: distances.length > 0 ? distances : [{ name: '5km', lots: [{ price: '', qty: '' }] }],
    });
    setEditingEventId(event.id);
    setPhotos([]);
    setPhotoPreviews([]);
    setSponsorUploading([]);
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

      const distances = form.distances.filter(d => d.name).map(d => ({
        name: d.name,
        price: parseFloat(d.lots[0]?.price || '0'),
        lots: d.lots.filter(l => l.price).map(l => ({ price: parseFloat(l.price), qty: parseInt(l.qty) || null })),
      }));
      const prices = distances.map(d => d.price);
      const score = calcScore(form, photoUrls.length > 0 || photos.length > 0);
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
        event_type: form.event_type || null,
        kit_items: form.kit_items.length > 0 ? form.kit_items : null,
        additional_info: form.additional_info || null,
        sponsors: form.sponsors.length > 0 ? form.sponsors : null,
        quality_score: score,
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
        });
        if (insertError) throw insertError;
        setSuccess(`✅ Evento criado! Link: https://022runner.com.br/evento/${slug}`);
      }

      setForm(emptyForm);
      setPhotos([]);
      setPhotoPreviews([]);
      setSponsorUploading([]);
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
            className="flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-lg hover:bg-[#B8962E] font-medium"
          >
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-lg"><Calendar className="text-[#C9A84C]" size={20} /></div>
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

        {/* Card destaque — Gerar Posts com IA */}
        <div className="rounded-xl p-4 mb-6 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4"
          style={{ backgroundColor: '#C9A84C' }}>
          <div className="flex items-center gap-3">
            <RunnerPostsIcon />
            <div>
              <p className="font-bold text-black text-base">Gerar Posts com IA</p>
              <p className="text-xs text-black/70">Crie posts automáticos para Instagram, WhatsApp e Facebook</p>
            </div>
          </div>
          <Link
            to="/gerador-social"
            className="flex-shrink-0 bg-black text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-gray-900 transition-colors"
          >
            Abrir gerador
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('eventos')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'eventos' ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 border'}`}>Meus Eventos</button>
          <button onClick={() => setTab('criar')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'criar' ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 border'}`}>Criar Evento</button>
        </div>

        {/* Lista de Eventos */}
        {tab === 'eventos' && (
          <div className="space-y-4 overflow-x-auto">
            {events.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Nenhum evento criado ainda.</p>
                <button onClick={() => setTab('criar')} className="mt-4 bg-[#C9A84C] text-white px-6 py-2 rounded-lg hover:bg-[#B8962E]">Criar primeiro evento</button>
              </div>
            ) : events.map(event => (
              <div key={event.id} className="bg-white rounded-xl border p-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
                {event.banner_url && <img src={event.banner_url} alt="" className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.city} · {new Date(event.date).toLocaleDateString('pt-BR')}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{event.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={`/evento/${event.slug}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-[#C9A84C] border rounded-lg" title="Visualizar"><Eye size={18} /></a>
                  <button onClick={() => openEdit(event)} className="p-2 text-gray-500 hover:text-[#C9A84C] border rounded-lg" title="Editar"><Edit size={18} /></button>
                  <button onClick={() => exportExcel(event)} className="p-2 text-gray-500 hover:text-green-600 border rounded-lg" title="Exportar Excel"><Download size={18} /></button>
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
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  placeholder="Ex: Corrida da Praia 2027" />
                {form.title && <p className="text-xs text-gray-400 mt-1">Link: 022runner.com.br/evento/{generateSlug(form.title)}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário de Largada</label>
                <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cidade *</label>
                <select value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]">
                  <option value="">Selecione a cidade</option>
                  {LAGOS_REGION_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local de Largada *</label>
                <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  placeholder="Ex: Praça da Paz" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Participantes</label>
                <input type="number" value={form.max_participants} onChange={e => setForm(p => ({ ...p, max_participants: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  placeholder="Ex: 500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prazo de Inscrição</label>
                <input type="date" value={form.registration_deadline} onChange={e => setForm(p => ({ ...p, registration_deadline: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição do Evento</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={4} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  placeholder="Descreva o evento, percurso, atrações..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Evento</label>
                <select value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]">
                  <option value="">Selecione o tipo</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kit do Evento</label>
                <div className="flex flex-wrap gap-2">
                  {KIT_OPTIONS.map(item => (
                    <label key={item} className="flex items-center gap-2 cursor-pointer bg-gray-50 border rounded-lg px-3 py-2 hover:bg-amber-50 hover:border-amber-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.kit_items.includes(item)}
                        onChange={e => setForm(p => ({
                          ...p,
                          kit_items: e.target.checked
                            ? [...p.kit_items, item]
                            : p.kit_items.filter(k => k !== item),
                        }))}
                        className="w-4 h-4 text-[#C9A84C]"
                      />
                      <span className="text-sm font-medium text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Informações Adicionais / Regulamento</label>
                <textarea value={form.additional_info} onChange={e => setForm(p => ({ ...p, additional_info: e.target.value }))}
                  rows={4} className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  placeholder="Regras, percurso detalhado, informações de kit, etc..." />
              </div>

              {/* Patrocinadores com upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Patrocinadores (máx. 3)</label>
                <div className="space-y-3">
                  {form.sponsors.map((s, i) => (
                    <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 border rounded-xl bg-gray-50">
                      {/* Preview ou placeholder do logo */}
                      <div className="flex-shrink-0">
                        {s.logo_url ? (
                          <img src={s.logo_url} alt={s.name} className="h-14 w-20 object-contain rounded-lg border bg-white" />
                        ) : (
                          <div className="h-14 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                            <Image size={20} className="text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Nome */}
                      <input
                        value={s.name}
                        onChange={e => setForm(p => { const sp = [...p.sponsors]; sp[i] = { ...sp[i], name: e.target.value }; return { ...p, sponsors: sp }; })}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                        placeholder="Nome do patrocinador"
                      />

                      {/* Upload de logo */}
                      <label className="cursor-pointer flex-shrink-0">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleSponsorLogoUpload(i, f); }}
                        />
                        <span className={`flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-2 transition-colors ${sponsorUploading[i] ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-[#C9A84C] text-[#C9A84C] hover:bg-amber-50 cursor-pointer'}`}>
                          <Upload size={13} />
                          {sponsorUploading[i] ? 'Enviando...' : 'Upload logo'}
                        </span>
                      </label>

                      {/* Remover */}
                      <button
                        onClick={() => setForm(p => ({ ...p, sponsors: p.sponsors.filter((_, j) => j !== i) }))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {form.sponsors.length < 3 && (
                    <button
                      onClick={() => setForm(p => ({ ...p, sponsors: [...p.sponsors, { name: '', logo_url: '' }] }))}
                      className="text-[#C9A84C] text-sm hover:underline"
                    >
                      + Adicionar patrocinador
                    </button>
                  )}
                </div>
              </div>

              {/* Score de qualidade */}
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">Score de Qualidade</label>
                  <span className="text-sm font-bold" style={{ color: calcScore(form, photos.length > 0) >= 70 ? '#16a34a' : '#d97706' }}>
                    {calcScore(form, photos.length > 0)}/100
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${calcScore(form, photos.length > 0)}%`,
                      backgroundColor: calcScore(form, photos.length > 0) >= 70 ? '#16a34a' : '#d97706',
                    }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Preencha mais campos para aumentar o score e ter mais visibilidade</p>
              </div>

              {/* Distâncias com Lotes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Distâncias e Lotes de Preço</label>
                <div className="space-y-4">
                  {form.distances.map((d, di) => (
                    <div key={di} className="border rounded-xl p-4 bg-gray-50">
                      <div className="flex gap-2 mb-3">
                        <input value={d.name} onChange={e => updateDistanceName(di, e.target.value)}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                          placeholder="Ex: 5km, 10km, 21km" />
                        {form.distances.length > 1 && (
                          <button onClick={() => removeDistance(di)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                        )}
                      </div>
                      <div className="space-y-2 pl-2">
                        {d.lots.map((lot, li) => (
                          <div key={li} className="flex gap-2 items-center">
                            <span className="text-xs font-semibold text-gray-500 w-14">Lote {li + 1}</span>
                            <input type="number" value={lot.price} onChange={e => updateLot(di, li, 'price', e.target.value)}
                              className="w-28 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                              placeholder="R$ preço" />
                            <input type="number" value={lot.qty} onChange={e => updateLot(di, li, 'qty', e.target.value)}
                              className="w-28 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                              placeholder="Vagas (opt)" />
                            {d.lots.length > 1 && (
                              <button onClick={() => removeLot(di, li)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                            )}
                          </div>
                        ))}
                        {d.lots.length < 3 && (
                          <button onClick={() => addLot(di)} className="text-[#C9A84C] text-xs hover:underline mt-1">+ Lote {d.lots.length + 1}</button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button onClick={addDistance} className="text-[#C9A84C] text-sm hover:underline">+ Adicionar distância</button>
                </div>
              </div>

              {/* Upload de Fotos */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Fotos do Evento (máx. 5)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-amber-400 transition-colors">
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
                        {i === 0 && <span className="absolute bottom-1 left-1 bg-[#C9A84C] text-white text-xs px-1 rounded">Capa</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setTab('eventos'); setEditingEventId(null); setForm(emptyForm); setSponsorUploading([]); }} className="flex-1 border text-gray-600 py-3 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-[#C9A84C] text-white py-3 rounded-lg hover:bg-[#B8962E] font-medium disabled:opacity-50">
                {loading ? 'Salvando...' : editingEventId ? '💾 Salvar Alterações' : '🚀 Publicar Evento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
