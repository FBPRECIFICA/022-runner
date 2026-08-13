import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { LAGOS_REGION_CITIES } from '../types';
import { Plus, Calendar, Users, TrendingUp, Image, Trash2, Eye, Edit, Download, Upload, DollarSign, Clock, ClipboardCheck, Search, Tag, X, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { RunnerPostsIcon } from '../components/RunnerPostsIcon';
import { computeAthleteStats } from '../lib/athleteStats';
import { summarizeCouponUsage } from '../lib/couponStats';
import { asaasFeeFromNetValue, netForOrganizer, paymentMethodLabel } from '../lib/asaasFee';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

type ExportStatusFilter = 'all' | 'paid' | 'pending' | 'cancelled';
const EXPORT_STATUS_OPTIONS: { value: ExportStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'paid', label: 'Apenas Pagos/Confirmados' },
  { value: 'pending', label: 'Apenas Pendentes/Aguardando' },
  { value: 'cancelled', label: 'Apenas Cancelados' },
];

const EVENT_TYPES = ['Corrida de Rua', 'Trail Run', 'Ciclismo', 'Triathlon', 'Caminhada', 'Outro'];
const KIT_OPTIONS = ['Camiseta', 'Medalha', 'Número de peito', 'Bag', 'Squeeze (Garrafinha de água)', 'Outros'];

interface Lot { price: string; qty: string; }
interface DistanceWithLots { name: string; lots: Lot[]; includes_shirt: boolean; }
// Padrão definitivo (13/08/2026): kit passa a ser sub-item da distância, sempre as
// duas opções — Econômico (sem camisa) e Completo (com camisa) — cada um com preço
// e lotes próprios. Ver supabase/migrations/20260813133423_create_event_distances_table.sql.
interface KitSlot { id?: string; lots: Lot[]; }
interface EventDistanceForm { id?: string; name: string; economico: KitSlot; completo: KitSlot; }

const emptyKitSlot = (): KitSlot => ({ lots: [{ price: '', qty: '' }] });
const emptyEventDistance = (): EventDistanceForm => ({ name: '', economico: emptyKitSlot(), completo: emptyKitSlot() });

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
  link_percurso: string;
  eventDistances: EventDistanceForm[];
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
  distances: [{ name: '5km', lots: [{ price: '', qty: '' }], includes_shirt: true }],
  link_percurso: '',
  eventDistances: [],
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

interface CouponForm {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
  max_uses: string;
  valid_until: string;
  event_id: string;
}

const emptyCouponForm: CouponForm = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  max_uses: '',
  valid_until: '',
  event_id: '',
};

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
  const [tab, setTab] = useState<'eventos' | 'criar' | 'cupons' | 'maisdados'>('eventos');
  const [events, setEvents] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponUsages, setCouponUsages] = useState<any[]>([]);
  const [couponUsageModal, setCouponUsageModal] = useState<any | null>(null);
  const [loadingCouponUsages, setLoadingCouponUsages] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingEventStatus, setEditingEventStatus] = useState<string>('published');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [sponsorUploading, setSponsorUploading] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<Record<string, any[]>>({});
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [regSearch, setRegSearch] = useState('');
  const [maisDadosEventId, setMaisDadosEventId] = useState<string | null>(null);
  const [exportModalEvent, setExportModalEvent] = useState<any | null>(null);

  useEffect(() => { loadEvents(); loadCoupons(); }, []);

  useEffect(() => {
    if (tab !== 'maisdados') return;
    if (!maisDadosEventId && events.length > 0) {
      setMaisDadosEventId(events[0].id);
      return;
    }
    if (maisDadosEventId) ensureEventRegsLoaded(maisDadosEventId);
  }, [tab, maisDadosEventId, events]);

  const ensureEventRegsLoaded = async (eventId: string) => {
    if (eventRegistrations[eventId]) return;
    setLoadingRegs(true);
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', eventId)
      .neq('status', 'cancelled')
      .order('registration_number');
    setEventRegistrations(prev => ({ ...prev, [eventId]: data || [] }));
    setLoadingRegs(false);
  };

  const toggleInscritos = async (eventId: string) => {
    if (expandedEventId === eventId) {
      setExpandedEventId(null);
      return;
    }
    setExpandedEventId(eventId);
    await ensureEventRegsLoaded(eventId);
  };

  const loadEvents = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('events')
      .select('*, registrations(count)')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false });
    setEvents(data || []);
    if (data && data.length > 0) {
      const eventIds = data.map((e: any) => e.id);
      const { data: regs } = await supabase
        .from('registrations')
        .select('*')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });
      setAllRegistrations(regs || []);
    } else {
      setAllRegistrations([]);
    }
  };

  const loadCoupons = async () => {
    const { data } = await supabase
      .from('coupons')
      .select('*, events(title)')
      .order('created_at', { ascending: false });
    setCoupons(data || []);

    setLoadingCouponUsages(true);
    const { data: usages } = await supabase
      .from('registrations')
      .select('name, full_name, email, created_at, discount_amount, coupon_code, status, events(title)')
      .not('coupon_code', 'is', null)
      .order('created_at', { ascending: false });
    setCouponUsages(usages || []);
    setLoadingCouponUsages(false);
  };

  const handleCreateCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    const code = couponForm.code.trim().toUpperCase();
    const value = parseFloat(couponForm.discount_value);

    if (!code) { setCouponError('Informe o código do cupom.'); return; }
    if (!/^[A-Z0-9+]+$/.test(code)) { setCouponError('Código deve conter apenas letras maiúsculas, números e +.'); return; }
    if (!value || value <= 0) { setCouponError('Informe um valor de desconto válido.'); return; }
    if (couponForm.discount_type === 'percent' && value > 100) { setCouponError('Desconto percentual não pode ser maior que 100%.'); return; }

    if (couponForm.discount_type === 'fixed' && couponForm.event_id) {
      const ev = events.find(e => e.id === couponForm.event_id);
      const prices = (ev?.distances || []).flatMap((d: any) => (d.lots || []).map((l: any) => Number(l.price) || Infinity));
      const minPrice = prices.length > 0 ? Math.min(...prices) : Infinity;
      if (Number.isFinite(minPrice) && value > minPrice) {
        setCouponError('Desconto em valor fixo não pode ser maior que o preço da inscrição.');
        return;
      }
    }

    if (coupons.some(c => String(c.code).toUpperCase() === code)) {
      setCouponError('Este código de cupom já está em uso.');
      return;
    }

    setCouponLoading(true);
    try {
      const { error } = await supabase.from('coupons').insert({
        code,
        discount_type: couponForm.discount_type,
        discount_value: value,
        max_uses: couponForm.max_uses ? parseInt(couponForm.max_uses) : null,
        valid_until: couponForm.valid_until || null,
        event_id: couponForm.event_id || null,
        organizer_id: user?.id,
        active: true,
      });
      if (error) {
        if (error.code === '23505') throw new Error('Este código de cupom já está em uso.');
        throw error;
      }
      setCouponSuccess('Cupom criado com sucesso!');
      setCouponForm(emptyCouponForm);
      loadCoupons();
    } catch (err: any) {
      setCouponError(err.message || 'Erro ao criar cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  const toggleCouponActive = async (coupon: any) => {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    loadCoupons();
  };

  const deleteCoupon = async (coupon: any) => {
    if (coupon.current_uses > 0) {
      toast.error('Este cupom já foi usado — desative em vez de excluir, pra não perder o histórico de uso.');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja excluir o cupom ${coupon.code}?`)) return;
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', coupon.id)
      .eq('organizer_id', user?.id);
    if (error) {
      toast.error('Erro ao excluir cupom: ' + error.message);
      return;
    }
    toast.success('Cupom excluído com sucesso');
    loadCoupons();
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
    setForm(prev => ({ ...prev, distances: [...prev.distances, { name: '', lots: [{ price: '', qty: '' }], includes_shirt: true }] }));
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

  const updateDistanceShirt = (index: number, value: boolean) => {
    setForm(prev => {
      const distances = [...prev.distances];
      distances[index] = { ...distances[index], includes_shirt: value };
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

  // Distâncias com kit (padrão definitivo): cada distância sempre tem os dois
  // slots (Econômico/Completo) prontos pra preencher preço, nunca soltos.
  const addEventDistance = () => {
    setForm(prev => ({ ...prev, eventDistances: [...prev.eventDistances, emptyEventDistance()] }));
  };

  const removeEventDistance = (index: number) => {
    setForm(prev => ({ ...prev, eventDistances: prev.eventDistances.filter((_, i) => i !== index) }));
  };

  const updateEventDistanceName = (index: number, value: string) => {
    setForm(prev => {
      const eventDistances = [...prev.eventDistances];
      eventDistances[index] = { ...eventDistances[index], name: value };
      return { ...prev, eventDistances };
    });
  };

  const updateKitSlot = (di: number, kit: 'economico' | 'completo', updater: (slot: KitSlot) => KitSlot) => {
    setForm(prev => {
      const eventDistances = prev.eventDistances.map((d, i) => i === di ? { ...d, [kit]: updater(d[kit]) } : d);
      return { ...prev, eventDistances };
    });
  };

  const updateKitLot = (di: number, kit: 'economico' | 'completo', li: number, field: 'price' | 'qty', value: string) =>
    updateKitSlot(di, kit, slot => ({ ...slot, lots: slot.lots.map((l, j) => j === li ? { ...l, [field]: value } : l) }));

  const addKitLot = (di: number, kit: 'economico' | 'completo') =>
    updateKitSlot(di, kit, slot => slot.lots.length < 3 ? { ...slot, lots: [...slot.lots, { price: '', qty: '' }] } : slot);

  const removeKitLot = (di: number, kit: 'economico' | 'completo', li: number) =>
    updateKitSlot(di, kit, slot => ({ ...slot, lots: slot.lots.filter((_, j) => j !== li) }));

  const statusLabel = (status: string) => {
    if (status === 'paid' || status === 'confirmed') return 'Pago';
    if (status === 'pending' || status === 'awaiting_payment') return 'Aguardando Pagamento';
    if (status === 'cancelled') return 'Cancelado';
    return status;
  };

  const exportExcel = async (event: any, statusFilter: ExportStatusFilter) => {
    const { data } = await supabase.from('registrations').select('*, registration_types(name, includes_shirt)').eq('event_id', event.id).order('registration_number');
    const filtered = (data || []).filter(r => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'paid') return r.status === 'paid' || r.status === 'confirmed';
      if (statusFilter === 'pending') return r.status === 'pending' || r.status === 'awaiting_payment';
      return r.status === 'cancelled';
    });
    const rows = filtered.map(r => {
      // includes_shirt vem do kit vinculado (fonte da verdade); quando não há
      // vínculo, cai pro nome do kit em texto — nunca assume que inclui camisa.
      const includesShirt = r.registration_types
        ? r.registration_types.includes_shirt
        : !(r.registration_type_name || '').toLowerCase().includes('econ');
      return {
        'Nome Completo': r.full_name || r.name,
        'Data de Nascimento': r.birth_date ? r.birth_date.split('-').reverse().join('/') : '-',
        'Nº Peito': r.registration_number,
        'Telefone': r.phone,
        'Categoria': r.distance_name,
        'Distância': r.distance_name,
        'Kit': includesShirt ? 'Completo' : 'Econômico',
        'Tamanho': includesShirt ? r.shirt_size : '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inscritos');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `inscritos-${event.slug}-${date}.xlsx`);
    setExportModalEvent(null);
  };

  const openEdit = async (event: any) => {
    const dateObj = new Date(event.date);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().slice(0, 5);
    const distances = (event.distances || []).map((d: any) => ({
      name: d.name || '',
      lots: d.lots ? d.lots.map((l: any) => ({ price: String(l.price || ''), qty: String(l.qty || '') }))
        : [{ price: String(d.price || ''), qty: '' }],
      includes_shirt: d.includes_shirt !== false,
    }));
    const { data: distRows } = await supabase
      .from('event_distances')
      .select('*, registration_types(*)')
      .eq('event_id', event.id)
      .order('sort_order');
    const toKitSlot = (t: any): KitSlot => t
      ? { id: t.id, lots: (t.lots && t.lots.length > 0 ? t.lots : [{ price: t.price ?? '', qty: '' }]).map((l: any) => ({ price: String(l.price ?? ''), qty: l.qty != null ? String(l.qty) : '' })) }
      : emptyKitSlot();
    const eventDistances: EventDistanceForm[] = (distRows || []).map((d: any) => ({
      id: d.id,
      name: d.name || '',
      economico: toKitSlot((d.registration_types || []).find((t: any) => t.includes_shirt === false)),
      completo: toKitSlot((d.registration_types || []).find((t: any) => t.includes_shirt === true)),
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
      distances: distances.length > 0 ? distances : [{ name: '5km', lots: [{ price: '', qty: '' }], includes_shirt: true }],
      link_percurso: event.link_percurso || '',
      eventDistances,
    });
    setEditingEventId(event.id);
    setEditingEventStatus(event.status || 'published');
    setPhotos([]);
    setPhotoPreviews([]);
    setSponsorUploading([]);
    setSuccess('');
    setError('');
    setTab('criar');
  };

  const handleSubmit = async (publishStatus: 'published' | 'draft' = 'published') => {
    setError('');
    if (!form.title || !form.date || !form.city || !form.location) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    // Padrão definitivo: toda distância cadastrada precisa das duas opções de kit
    // (Econômico sem camisa, Completo com camisa), cada uma com preço válido —
    // nunca uma distância "pela metade" chegando na tela do atleta.
    const eventDistancesToSave = form.eventDistances.filter(d => d.name.trim());
    const kitPrice = (slot: KitSlot) => parseFloat(slot.lots[0]?.price || '0');
    if (eventDistancesToSave.some(d => !(kitPrice(d.economico) > 0) || !(kitPrice(d.completo) > 0))) {
      setError('Toda distância precisa dos dois kits (Econômico e Completo) com preço válido.');
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
        includes_shirt: d.includes_shirt !== false,
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
        link_percurso: form.link_percurso || null,
        quality_score: score,
      };

      if (photoUrls.length > 0) {
        payload.photos = photoUrls;
        payload.banner_url = photoUrls[0];
      }

      let savedEventId = editingEventId;

      if (editingEventId) {
        const { error: updateError } = await supabase
          .from('events')
          .update({ ...payload, status: publishStatus })
          .eq('id', editingEventId);
        if (updateError) throw updateError;
        setSuccess('Evento atualizado com sucesso!');
      } else {
        const slug = generateSlug(form.title);
        const { data: insertedEvent, error: insertError } = await supabase.from('events').insert({
          ...payload,
          slug,
          organizer_id: user?.id,
          status: publishStatus,
          plan: 'free',
        }).select().single();
        if (insertError) throw insertError;
        savedEventId = insertedEvent.id;
        setSuccess(publishStatus === 'draft'
          ? '💾 Rascunho salvo! O evento não aparece publicamente ainda.'
          : `✅ Evento publicado! Link: https://022runners.com.br/evento/${slug}`);
      }

      // Distâncias com kit (padrão definitivo): upsert em vez de apagar-tudo-e-
      // recriar a cada salvamento — preserva o id (e o vínculo com inscrições já
      // feitas) de tudo que não mudou de verdade. O padrão antigo de apagar e
      // recriar já órfãou o registration_type_id de inscrições reais (ver
      // migration 20260813133713_migrate_balneario_run_and_arena_mmp_to_distance_kits.sql).
      const { data: existingDist } = await supabase
        .from('event_distances')
        .select('id, registration_types(id)')
        .eq('event_id', savedEventId);
      const keptDistanceIds = new Set(eventDistancesToSave.filter(d => d.id).map(d => d.id));
      const distancesToRemove = (existingDist || []).filter(d => !keptDistanceIds.has(d.id));
      if (distancesToRemove.length > 0) {
        const kitIdsToRemove = distancesToRemove.flatMap(d => (d.registration_types || []).map((t: any) => t.id));
        const { count } = await supabase
          .from('registrations')
          .select('id', { count: 'exact', head: true })
          .in('registration_type_id', kitIdsToRemove.length > 0 ? kitIdsToRemove : ['00000000-0000-0000-0000-000000000000']);
        if (count && count > 0) {
          throw new Error('Não é possível remover uma distância que já tem inscrições vinculadas a ela.');
        }
        const { error: delDistError } = await supabase.from('event_distances').delete().in('id', distancesToRemove.map(d => d.id));
        if (delDistError) throw delDistError;
      }

      const kitDefs: { key: 'economico' | 'completo'; name: string; includes_shirt: boolean }[] = [
        { key: 'economico', name: 'Kit Econômico', includes_shirt: false },
        { key: 'completo', name: 'Kit Completo', includes_shirt: true },
      ];
      for (let i = 0; i < eventDistancesToSave.length; i++) {
        const d = eventDistancesToSave[i];
        let distanceId = d.id;
        if (distanceId) {
          const { error: distErr } = await supabase.from('event_distances').update({ name: d.name, sort_order: i }).eq('id', distanceId);
          if (distErr) throw distErr;
        } else {
          const { data: newDist, error: distErr } = await supabase
            .from('event_distances')
            .insert({ event_id: savedEventId, name: d.name, sort_order: i })
            .select('id').single();
          if (distErr) throw distErr;
          distanceId = newDist.id;
        }

        for (const { key, name, includes_shirt } of kitDefs) {
          const slot = d[key];
          const lots = slot.lots.filter(l => l.price).map(l => ({ price: parseFloat(l.price), qty: parseInt(l.qty) || null }));
          const price = lots[0]?.price ?? 0;
          if (slot.id) {
            const { error: kitErr } = await supabase.from('registration_types')
              .update({ name, price, lots, includes_shirt })
              .eq('id', slot.id);
            if (kitErr) throw kitErr;
          } else {
            const { error: kitErr } = await supabase.from('registration_types').insert({
              event_id: savedEventId, distance_id: distanceId, name, price, lots, includes_shirt,
              sort_order: key === 'economico' ? 0 : 1,
            });
            if (kitErr) throw kitErr;
          }
        }
      }

      setForm(emptyForm);
      setPhotos([]);
      setPhotoPreviews([]);
      setSponsorUploading([]);
      setEditingEventId(null);
      setEditingEventStatus('published');
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
              <div><p className="text-2xl font-bold">{allRegistrations.filter(r => r.status !== 'cancelled').length}</p><p className="text-sm text-gray-500">Inscritos</p></div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg"><TrendingUp className="text-purple-600" size={20} /></div>
              <div><p className="text-2xl font-bold">R$ {allRegistrations.filter(r => r.status === 'paid' || r.status === 'confirmed').reduce((s: number, r: any) => s + Number(r.base_amount ?? r.amount ?? 0), 0).toFixed(2).replace('.', ',')}</p><p className="text-sm text-gray-500">Receita</p></div>
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
          <button onClick={() => setTab('cupons')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'cupons' ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 border'}`}>Cupons</button>
          <button onClick={() => setTab('maisdados')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'maisdados' ? 'bg-[#C9A84C] text-white' : 'bg-white text-gray-600 border'}`}>Mais Dados</button>
        </div>

        {/* Lista de Eventos */}
        {tab === 'eventos' && (() => {
          const paidRegs = allRegistrations.filter(r => r.status === 'paid' || r.status === 'confirmed');
          const pendingRegs = allRegistrations.filter(r => r.status === 'pending' || r.status === 'awaiting_payment');
          const totalBruto = paidRegs.reduce((s, r) => s + Number(r.base_amount ?? r.amount ?? 0), 0);
          const estimadoAReceber = paidRegs.reduce((s, r) => {
            const base = Number(r.base_amount ?? r.amount ?? 0);
            const net = netForOrganizer(Number(r.platform_fee ?? 0), r.asaas_net_value);
            return s + (net ?? base);
          }, 0);

          const weeklyData = (() => {
            const weeks: Record<string, number> = {};
            paidRegs.forEach(r => {
              const d = new Date(r.created_at);
              const start = new Date(d.getFullYear(), 0, 1);
              const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
              const key = `Sem ${week}`;
              weeks[key] = (weeks[key] || 0) + 1;
            });
            return Object.entries(weeks).slice(-8).map(([name, value]) => ({ name, value }));
          })();

          return (
            <>
              {/* Cards financeiros */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                <div className="bg-white rounded-xl p-4 border-2" style={{ borderColor: '#C9A84C' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={16} style={{ color: '#C9A84C' }} />
                    <span className="text-xs font-medium text-gray-500">Total Bruto</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: '#C9A84C' }}>R$ {totalBruto.toFixed(2).replace('.', ',')}</p>
                  <p className="text-xs text-gray-400">{paidRegs.length} inscr. pagas</p>
                </div>
                <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#86efac' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={16} className="text-green-500" />
                    <span className="text-xs font-medium text-gray-500">Est. a Receber*</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">R$ {estimadoAReceber.toFixed(2).replace('.', ',')}</p>
                  <p className="text-xs text-gray-400">valor líquido, já descontada taxa Asaas</p>
                </div>
                <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#fde68a' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={16} className="text-yellow-500" />
                    <span className="text-xs font-medium text-gray-500">Aguardando</span>
                  </div>
                  <p className="text-xl font-bold text-yellow-600">{pendingRegs.length}</p>
                  <p className="text-xs text-gray-400">inscrições pendentes</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 -mt-4 mb-4">
                * Valor real registrado pelo Asaas em cada pagamento (não é estimativa). A taxa de 10% da plataforma é paga pelo atleta e não desconta a receita do organizador.
              </p>

              {/* Gráfico de inscrições por semana */}
              {weeklyData.length > 0 && (
                <div className="bg-white rounded-xl border p-4 mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Inscrições por Semana</h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weeklyData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="value" fill="#C9A84C" radius={[4, 4, 0, 0]} name="Inscrições" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Tabela de transações */}
              {allRegistrations.length > 0 && (() => {
                const filteredRegs = regSearch.trim()
                  ? allRegistrations.filter(r =>
                      r.name?.toLowerCase().includes(regSearch.toLowerCase()) ||
                      r.registration_number?.toLowerCase().includes(regSearch.toLowerCase())
                    )
                  : allRegistrations;
                return (
                <div className="bg-white rounded-xl border mb-6 overflow-hidden">
                  <div className="px-4 py-3 border-b flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-semibold text-gray-700">Inscritos</h3>
                    <div className="relative flex-1 min-w-[200px]">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={regSearch}
                        onChange={e => setRegSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                        placeholder="Buscar por nome ou nº de peito..."
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b text-gray-500">
                          <th className="px-4 py-2 font-medium">Atleta</th>
                          <th className="px-4 py-2 font-medium">Nº Peito</th>
                          <th className="px-4 py-2 font-medium">Valor Inscrição</th>
                          <th className="px-4 py-2 font-medium">Taxa Asaas</th>
                          <th className="px-4 py-2 font-medium">Est. Líquido</th>
                          <th className="px-4 py-2 font-medium">Forma Pgto</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                          <th className="px-4 py-2 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRegs.slice(0, 50).map(r => {
                          const valorInscricao = Number(r.base_amount ?? r.amount ?? 0);
                          const valorCobrado = Number(r.amount ?? r.base_amount ?? 0);
                          const taxaAsaas = asaasFeeFromNetValue(valorCobrado, r.asaas_net_value);
                          const estLiquido = netForOrganizer(Number(r.platform_fee ?? 0), r.asaas_net_value);
                          const isPaid = r.status === 'paid' || r.status === 'confirmed';
                          const isCancelled = r.status === 'cancelled';
                          return (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                            <td className="px-4 py-2 font-mono font-bold" style={{ color: '#C9A84C' }}>{r.registration_number}</td>
                            <td className="px-4 py-2 text-gray-700">R$ {valorInscricao.toFixed(2).replace('.', ',')}</td>
                            <td className="px-4 py-2 text-gray-500">{taxaAsaas != null ? `R$ ${taxaAsaas.toFixed(2).replace('.', ',')}` : '-'}</td>
                            <td className="px-4 py-2 font-medium text-green-600">{estLiquido != null ? `R$ ${estLiquido.toFixed(2).replace('.', ',')}` : '-'}</td>
                            <td className="px-4 py-2 text-gray-500">{paymentMethodLabel(r.payment_method)}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isPaid
                                  ? 'bg-green-100 text-green-700'
                                  : isCancelled
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {isPaid ? 'Pago' : isCancelled ? 'Cancelado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })()}

              <div className="space-y-4 overflow-x-auto">
            {events.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">Nenhum evento criado ainda.</p>
                <button onClick={() => setTab('criar')} className="mt-4 bg-[#C9A84C] text-white px-6 py-2 rounded-lg hover:bg-[#B8962E]">Criar primeiro evento</button>
              </div>
            ) : events.map(event => (
              <div key={event.id} className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 flex flex-wrap sm:flex-nowrap items-center gap-4">
                  {event.banner_url && <img src={event.banner_url} alt="" className="w-20 h-16 object-cover rounded-lg flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{event.title}</h3>
                    <p className="text-sm text-gray-500">{event.city} · {new Date(event.date).toLocaleDateString('pt-BR')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${event.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{event.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
                      <button
                        onClick={() => toggleInscritos(event.id)}
                        className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100 transition-colors"
                      >
                        {event.registrations?.[0]?.count ?? 0} inscritos {expandedEventId === event.id ? '▲' : '▼'}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a href={`/evento/${event.slug}`} target="_blank" rel="noreferrer" className="p-2 text-gray-500 hover:text-[#C9A84C] border rounded-lg" title="Visualizar"><Eye size={18} /></a>
                    <button onClick={() => openEdit(event)} className="p-2 text-gray-500 hover:text-[#C9A84C] border rounded-lg" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => setExportModalEvent(event)} className="p-2 text-gray-500 hover:text-green-600 border rounded-lg" title="Exportar Excel"><Download size={18} /></button>
                    <Link to={`/checkin/${event.slug}`} className="p-2 text-gray-500 hover:text-purple-600 border rounded-lg" title="Check-in"><ClipboardCheck size={18} /></Link>
                  </div>
                </div>

                {/* Lista de inscritos expandível */}
                {expandedEventId === event.id && (
                  <div className="border-t bg-gray-50">
                    {loadingRegs ? (
                      <div className="flex items-center justify-center py-6">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C9A84C]" />
                      </div>
                    ) : (eventRegistrations[event.id] || []).length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-6">Nenhum inscrito ainda.</p>
                    ) : (() => {
                      const regs = eventRegistrations[event.id] || [];
                      const kitCounts = regs.reduce((acc: Record<string, number>, r) => {
                        if (r.registration_type_name) acc[r.registration_type_name] = (acc[r.registration_type_name] || 0) + 1;
                        return acc;
                      }, {});
                      const kitEntries = Object.entries(kitCounts);
                      return (
                      <div className="overflow-x-auto">
                        {kitEntries.length > 0 && (
                          <div className="px-4 pt-3 flex flex-wrap gap-2">
                            {kitEntries.map(([name, count]) => (
                              <span key={name} className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 font-medium">
                                {name}: {count}
                              </span>
                            ))}
                          </div>
                        )}
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left border-b" style={{ color: '#6b7280' }}>
                              <th className="px-4 py-2 font-medium">Nº Peito</th>
                              <th className="px-4 py-2 font-medium">Nome</th>
                              <th className="px-4 py-2 font-medium">Categoria</th>
                              <th className="px-4 py-2 font-medium">Kit</th>
                              <th className="px-4 py-2 font-medium">Pagamento</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regs.map(r => (
                              <tr key={r.id} className="border-b last:border-0 hover:bg-white transition-colors">
                                <td className="px-4 py-2 font-mono font-bold text-[#C9A84C]">{r.registration_number}</td>
                                <td className="px-4 py-2 text-gray-900">{r.name}</td>
                                <td className="px-4 py-2 text-gray-500">{r.distance_name}</td>
                                <td className="px-4 py-2 text-gray-500">{r.registration_type_name || '-'}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    r.status === 'paid' || r.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                    r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {r.status === 'paid' || r.status === 'confirmed' ? '✅ Pago' :
                                     r.status === 'pending' ? '⏳ Pendente' : r.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
              </div>
            </>
          );
        })()}

        {/* Cupons */}
        {tab === 'cupons' && (() => {
          const activeCouponsCount = coupons.filter(c => c.active).length;
          const today = new Date().toDateString();
          // Só contamos cupom aplicado num pagamento que realmente foi confirmado — pendente
          // (carrinho abandonado) infla o número que o organizador usa pra avaliar parcerias.
          const paidCouponUsages = couponUsages.filter(u => u.status === 'paid' || u.status === 'confirmed');
          const usesToday = paidCouponUsages.filter(u => new Date(u.created_at).toDateString() === today).length;
          const totalDiscountGranted = paidCouponUsages.reduce((s, u) => s + Number(u.discount_amount || 0), 0);
          const couponUsageSummary = summarizeCouponUsage(couponUsages);

          return (
          <div className="space-y-6">
            {/* Resumo de cupons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#C9A84C' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Tag size={16} style={{ color: '#C9A84C' }} />
                  <span className="text-xs font-medium text-gray-500">Cupons Ativos</span>
                </div>
                <p className="text-xl font-bold" style={{ color: '#C9A84C' }}>{activeCouponsCount}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#86efac' }}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} className="text-green-500" />
                  <span className="text-xs font-medium text-gray-500">Usos Hoje</span>
                </div>
                <p className="text-xl font-bold text-green-600">{usesToday}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border" style={{ borderColor: '#fca5a5' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Percent size={16} className="text-red-400" />
                  <span className="text-xs font-medium text-gray-500">Descontos Concedidos</span>
                </div>
                <p className="text-xl font-bold text-red-400">R$ {totalDiscountGranted.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Tag size={18} style={{ color: '#C9A84C' }} /> Criar Cupom</h2>

              {couponError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{couponError}</div>}
              {couponSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">{couponSuccess}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código do Cupom</label>
                  <input
                    value={couponForm.code}
                    onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    placeholder="Ex: CORRIDAFREE10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
                  <select
                    value={couponForm.discount_type}
                    onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value as 'percent' | 'fixed' }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  >
                    <option value="percent">Percentual %</option>
                    <option value="fixed">Valor fixo R$</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Desconto</label>
                  <input
                    type="number"
                    value={couponForm.discount_value}
                    onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    placeholder={couponForm.discount_type === 'percent' ? 'Ex: 10 (para 10%)' : 'Ex: 15 (para R$15)'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Usos (opcional)</label>
                  <input
                    type="number"
                    value={couponForm.max_uses}
                    onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                    placeholder="Deixe vazio para ilimitado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Válido até (opcional)</label>
                  <input
                    type="date"
                    value={couponForm.valid_until}
                    onChange={e => setCouponForm(p => ({ ...p, valid_until: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aplicar a</label>
                  <select
                    value={couponForm.event_id}
                    onChange={e => setCouponForm(p => ({ ...p, event_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  >
                    <option value="">Todos os eventos</option>
                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={handleCreateCoupon}
                disabled={couponLoading}
                className="mt-5 bg-[#C9A84C] text-white px-5 py-2.5 rounded-lg hover:bg-[#B8962E] font-medium disabled:opacity-50"
              >
                {couponLoading ? 'Criando...' : 'Criar Cupom'}
              </button>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Cupons Criados</h3>
              </div>
              {coupons.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum cupom criado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b text-gray-500">
                        <th className="px-4 py-2 font-medium">Código</th>
                        <th className="px-4 py-2 font-medium">Desconto</th>
                        <th className="px-4 py-2 font-medium">Usos</th>
                        <th className="px-4 py-2 font-medium">Válido até</th>
                        <th className="px-4 py-2 font-medium">Evento</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                        <th className="px-4 py-2 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(c => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono font-bold text-gray-900">{c.code}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2).replace('.', ',')}`}
                          </td>
                          <td className="px-4 py-2">
                            {c.current_uses > 0 ? (
                              <button
                                onClick={() => setCouponUsageModal(c)}
                                className="font-semibold underline decoration-dotted hover:opacity-80"
                                style={{ color: '#C9A84C' }}
                              >
                                {c.current_uses}{c.max_uses ? ` de ${c.max_uses} usos` : ''}
                              </button>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-500">
                            {c.valid_until ? new Date(c.valid_until).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td className="px-4 py-2 text-gray-500">{c.events?.title || 'Todos'}</td>
                          <td className="px-4 py-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {c.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleCouponActive(c)}
                                className="text-xs px-2 py-1 rounded-lg border text-gray-600 hover:bg-gray-50"
                              >
                                {c.active ? 'Desativar' : 'Ativar'}
                              </button>
                              {c.current_uses > 0 ? (
                                <span
                                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed"
                                  title="Cupom já usado — desative em vez de excluir, pra não perder o histórico de uso"
                                >
                                  Excluir
                                </span>
                              ) : (
                                <button
                                  onClick={() => deleteCoupon(c)}
                                  className="text-xs px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2"><TrendingUp size={16} style={{ color: '#C9A84C' }} /> Demonstrativo de Uso de Cupons</h3>
                <p className="text-xs text-gray-400 mt-0.5">Inclui cupons já usados mesmo que tenham sido excluídos depois</p>
              </div>
              {loadingCouponUsages ? (
                <p className="text-center text-gray-400 text-sm py-8">Carregando...</p>
              ) : couponUsageSummary.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum cupom foi usado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b text-gray-500">
                        <th className="px-4 py-2 font-medium">Código</th>
                        <th className="px-4 py-2 font-medium">Usos</th>
                        <th className="px-4 py-2 font-medium">Desconto Total Concedido</th>
                        <th className="px-4 py-2 font-medium">Último Uso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {couponUsageSummary.map(s => (
                        <tr key={s.code} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono font-bold text-gray-900">{s.code}</td>
                          <td className="px-4 py-2 text-gray-700">{s.usos}</td>
                          <td className="px-4 py-2 text-gray-700">R$ {s.totalDiscount.toFixed(2).replace('.', ',')}</td>
                          <td className="px-4 py-2 text-gray-500">{new Date(s.lastUse).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal de seleção de status pra exportação */}
            {exportModalEvent && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setExportModalEvent(null)}>
                <div className="w-full max-w-sm rounded-2xl bg-white" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b">
                    <h3 className="text-lg font-bold text-gray-900">Exportar Excel</h3>
                    <button onClick={() => setExportModalEvent(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
                  </div>
                  <div className="p-5 space-y-2">
                    <p className="text-sm text-gray-500 mb-3">Quais inscritos de "{exportModalEvent.title}" você quer exportar?</p>
                    {EXPORT_STATUS_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => exportExcel(exportModalEvent, opt.value)}
                        className="w-full text-left px-4 py-2.5 rounded-lg border hover:border-[#C9A84C] hover:bg-amber-50 text-sm font-medium text-gray-700"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Modal de uso do cupom */}
            {couponUsageModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setCouponUsageModal(null)}>
                <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-white flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b">
                    <h3 className="text-lg font-bold text-gray-900">Quem usou o cupom {couponUsageModal.code}</h3>
                    <button onClick={() => setCouponUsageModal(null)} className="p-1 rounded-lg hover:bg-gray-100"><X size={20} /></button>
                  </div>
                  <div className="p-5 overflow-y-auto">
                    {loadingCouponUsages ? (
                      <p className="text-center text-gray-400 text-sm py-8">Carregando...</p>
                    ) : (() => {
                      const usages = couponUsages.filter(u => u.coupon_code === couponUsageModal.code);
                      return usages.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-8">Nenhum uso registrado ainda.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left border-b text-gray-500">
                                <th className="px-3 py-2 font-medium">Atleta</th>
                                <th className="px-3 py-2 font-medium">Email</th>
                                <th className="px-3 py-2 font-medium">Evento</th>
                                <th className="px-3 py-2 font-medium">Data</th>
                                <th className="px-3 py-2 font-medium">Status</th>
                                <th className="px-3 py-2 font-medium">Desconto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usages.map((u, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="px-3 py-2 font-medium text-gray-900">{u.name || u.full_name}</td>
                                  <td className="px-3 py-2 text-gray-500">{u.email}</td>
                                  <td className="px-3 py-2 text-gray-500">{u.events?.title || '—'}</td>
                                  <td className="px-3 py-2 text-gray-500">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'paid' || u.status === 'confirmed' ? 'bg-green-100 text-green-700' : u.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                                      {statusLabel(u.status)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-700">R$ {Number(u.discount_amount || 0).toFixed(2).replace('.', ',')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* Mais Dados */}
        {tab === 'maisdados' && (() => {
          const regs = maisDadosEventId ? (eventRegistrations[maisDadosEventId] || []) : [];
          const { confirmed: confirmedRegsMd, pending: pendingRegsMd, genderData, avgAge, minAge, maxAge, lastRegs } = computeAthleteStats(regs);

          return (
            <>
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Evento</label>
                <select
                  value={maisDadosEventId || ''}
                  onChange={e => setMaisDadosEventId(e.target.value || null)}
                  className="w-full sm:w-80 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                >
                  <option value="">Selecione um evento</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>

              {!maisDadosEventId ? (
                <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Selecione um evento para ver os dados.</div>
              ) : loadingRegs && !eventRegistrations[maisDadosEventId] ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C9A84C]" />
                </div>
              ) : regs.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center text-gray-400">Nenhum inscrito neste evento ainda.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Confirmados</p>
                      <p className="text-2xl font-bold text-green-600">{confirmedRegsMd.length}</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 border-2 border-yellow-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">Pendentes</p>
                      <p className="text-2xl font-bold text-yellow-600">{pendingRegsMd.length}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Sexo dos Atletas</h3>
                      {genderData.length === 0 ? (
                        <p className="text-sm text-gray-400 py-8 text-center">Sem dados de sexo.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                              {genderData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Legend />
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="bg-white rounded-xl border p-4">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Idade dos Atletas</h3>
                      {avgAge === null ? (
                        <p className="text-sm text-gray-400 py-8 text-center">Sem dados de idade.</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: '#C9A84C' }}>{avgAge}</p>
                            <p className="text-xs text-gray-500">Idade média</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-500">{minAge}</p>
                            <p className="text-xs text-gray-500">Mais jovem</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-500">{maxAge}</p>
                            <p className="text-xs text-gray-500">Mais experiente</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="px-4 py-3 border-b">
                      <h3 className="text-sm font-semibold text-gray-700">Últimos Inscritos</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b text-gray-500">
                            <th className="px-4 py-2 font-medium">Atleta</th>
                            <th className="px-4 py-2 font-medium">Nº Peito</th>
                            <th className="px-4 py-2 font-medium">Status</th>
                            <th className="px-4 py-2 font-medium">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lastRegs.map(r => {
                            const isPaid = r.status === 'paid' || r.status === 'confirmed';
                            return (
                              <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="px-4 py-2 font-medium text-gray-900">{r.name}</td>
                                <td className="px-4 py-2 font-mono font-bold" style={{ color: '#C9A84C' }}>{r.registration_number}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {isPaid ? 'Confirmado' : 'Pendente'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-400 text-xs">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </>
          );
        })()}

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
                {form.title && <p className="text-xs text-gray-400 mt-1">Link: 022runners.com.br/evento/{generateSlug(form.title)}</p>}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Link do Percurso (Garmin, Strava, Komoot...)</label>
                <input type="url" value={form.link_percurso} onChange={e => setForm(p => ({ ...p, link_percurso: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                  placeholder="https://connect.garmin.com/modern/course/..." />
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
                {editingEventId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 text-xs text-amber-800">
                    ℹ️ Você pode alterar o preço a qualquer momento, mesmo com o evento já publicado. As inscrições já realizadas mantêm o valor original — apenas novas inscrições usarão o novo valor.
                  </div>
                )}
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
                      <label className="flex items-center gap-2 text-xs text-gray-600 mb-3 pl-1">
                        <input type="checkbox" checked={d.includes_shirt} onChange={e => updateDistanceShirt(di, e.target.checked)} />
                        Inclui camiseta
                      </label>
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

              {/* Distâncias com Kit — padrão definitivo: toda distância cadastrada aqui
                  sempre tem os dois kits (Econômico sem camisa / Completo com camisa) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Distâncias com Kit</label>
                <p className="text-xs text-gray-500 mb-3">
                  Cada distância tem sempre os dois kits — Econômico (sem camisa) e Completo (com camisa) — cada um com seu preço. É o que o atleta escolhe na inscrição: primeiro a distância, depois o kit.
                </p>
                <div className="space-y-4">
                  {form.eventDistances.map((d, di) => (
                    <div key={di} className="border rounded-xl p-4 bg-gray-50">
                      <div className="flex gap-2 mb-3">
                        <input value={d.name} onChange={e => updateEventDistanceName(di, e.target.value)}
                          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] bg-white"
                          placeholder="Ex: 5km, 10km, 21km" />
                        <button onClick={() => removeEventDistance(di)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {(['economico', 'completo'] as const).map(kit => (
                          <div key={kit} className="border rounded-lg p-3 bg-white">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              {kit === 'economico' ? 'Kit Econômico (sem camisa)' : 'Kit Completo (com camisa)'}
                            </p>
                            <div className="space-y-2">
                              {d[kit].lots.map((lot, li) => (
                                <div key={li} className="flex gap-2 items-center">
                                  <span className="text-xs font-semibold text-gray-500 w-14">Lote {li + 1}</span>
                                  <input type="number" value={lot.price} onChange={e => updateKitLot(di, kit, li, 'price', e.target.value)}
                                    className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                                    placeholder="R$ preço" />
                                  <input type="number" value={lot.qty} onChange={e => updateKitLot(di, kit, li, 'qty', e.target.value)}
                                    className="w-24 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
                                    placeholder="Vagas (opt)" />
                                  {d[kit].lots.length > 1 && (
                                    <button onClick={() => removeKitLot(di, kit, li)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                  )}
                                </div>
                              ))}
                              {d[kit].lots.length < 3 && (
                                <button onClick={() => addKitLot(di, kit)} className="text-[#C9A84C] text-xs hover:underline mt-1">+ Lote {d[kit].lots.length + 1}</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={addEventDistance} className="text-[#C9A84C] text-sm hover:underline">+ Adicionar distância com kit</button>
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

            <div className="flex gap-3 mt-6 flex-wrap">
              <button onClick={() => { setTab('eventos'); setEditingEventId(null); setEditingEventStatus('published'); setForm(emptyForm); setSponsorUploading([]); }} className="border text-gray-600 py-3 px-5 rounded-lg hover:bg-gray-50 font-medium">Cancelar</button>
              {(!editingEventId || editingEventStatus === 'draft') && (
                <button onClick={() => handleSubmit('draft')} disabled={loading}
                  className="flex-1 border-2 text-gray-700 py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-gray-50"
                  style={{ borderColor: '#C9A84C' }}>
                  {loading ? 'Salvando...' : '💾 Salvar Rascunho'}
                </button>
              )}
              <button onClick={() => handleSubmit('published')} disabled={loading}
                className="flex-1 bg-[#C9A84C] text-white py-3 rounded-lg hover:bg-[#B8962E] font-medium disabled:opacity-50">
                {loading ? 'Salvando...' : (!editingEventId || editingEventStatus === 'draft') ? '🚀 Publicar Evento' : '💾 Salvar Alterações'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
