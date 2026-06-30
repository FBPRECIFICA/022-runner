import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { trackRegistrationStart, trackRegistrationComplete } from '../utils/analytics';
import { validateCPF } from '../utils/validators';
import { TermoResponsabilidade } from '../components/TermoResponsabilidade';
import { SecurityBadges } from '../components/SecurityBadges';

const SHIRT_SIZES = ['P', 'M', 'G', 'GG'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei'];
const LS_KEY = 'reg_form_draft';

type Step = 'form' | 'termo' | 'confirmação';
const STEPS: Step[] = ['form', 'termo', 'confirmação'];
const STEP_LABELS = ['1. Dados', '2. Termo', '3. Confirmação'];

function formatCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.length <= 10
    ? d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{4})$/, '$1-$2')
    : d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{4})$/, '$1-$2');
}
function formatBirthdate(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function birthdateToISO(v: string): string | null {
  const p = v.split('/');
  if (p.length !== 3 || p[2].length !== 4) return null;
  return `${p[2]}-${p[1]}-${p[0]}`;
}
export function RegistrationPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  const [form, setForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || defaultForm(user); }
    catch { return defaultForm(user); }
  });

  function defaultForm(u: any) {
    return {
      name: u?.name || '', cpf: '', birthdate: '', phone: '', email: u?.email || '',
      city: '', gender: '', shirt_size: '', distance_index: 0,
      team_name: '', emergency_contact: '', blood_type: '', medical_condition: '',
    };
  }

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', eventSlug).single()
      .then(({ data }) => { setEvent(data); if (data) trackRegistrationStart(data.title); setLoading(false); });
  }, [eventSlug]);

  // Pré-preenche campos com dados do perfil do usuário logado
  useEffect(() => {
    if (!user?.id) return;
    const draft = localStorage.getItem(LS_KEY);
    if (draft) return; // não sobrescreve rascunho já existente
    supabase.from('users').select('name, email, phone, cpf, city').eq('id', user.id).single()
      .then(({ data }) => {
        if (!data) return;
        setForm((prev: any) => ({
          ...prev,
          name: prev.name || data.name || '',
          email: prev.email || data.email || '',
          phone: prev.phone || (data.phone ? data.phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : ''),
          cpf: prev.cpf || (data.cpf ? data.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : ''),
          city: prev.city || data.city || '',
        }));
      });
  }, [user?.id]);

  // Salvar rascunho no localStorage
  useEffect(() => {
    if (!loading) localStorage.setItem(LS_KEY, JSON.stringify(form));
  }, [form, loading]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return 'Informe seu nome completo.';
    if (!validateCPF(form.cpf)) return 'CPF inválido. Verifique os dígitos.';
    if (!form.birthdate) return 'Informe sua data de nascimento.';
    if (form.phone.replace(/\D/g, '').length < 10) return 'Telefone inválido.';
    if (!form.email.trim()) return 'Informe seu e-mail.';
    if (!form.city.trim()) return 'Informe sua cidade.';
    if (!form.gender) return 'Selecione o sexo.';
    if (!form.shirt_size) return 'Selecione o tamanho da camiseta.';
    return '';
  };

  const handleNext = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setStep('termo');
  };

  const handleTermoAccepted = async () => {
    setSubmitting(true);
    setError('');
    try {
      const distances = event.distances || [];
      const chosen = distances[form.distance_index] || distances[0];
      const price = chosen?.lots?.[0]?.price ?? chosen?.price ?? 0;

      // Proteção contra inscrição duplicada pelo mesmo CPF no mesmo evento
      const cleanCpf = form.cpf.replace(/\D/g, '');
      const { count: dupCount } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('cpf', cleanCpf)
        .neq('status', 'cancelled');
      if ((dupCount ?? 0) > 0) {
        setError('Este CPF já possui uma inscrição ativa para este evento.');
        setStep('form');
        setSubmitting(false);
        return;
      }

      // registration_number gerado atomicamente pelo trigger trg_auto_registration_number no banco
      const { data, error: insertError } = await supabase.from('registrations').insert({
        event_id: event.id,
        user_id: user?.id || null,
        name: form.name,
        cpf: cleanCpf,
        birth_date: birthdateToISO(form.birthdate) || null,
        phone: form.phone.replace(/\D/g, ''),
        email: form.email,
        city: form.city,
        gender: form.gender,
        shirt_size: form.shirt_size,
        distance_name: chosen?.name || null,
        distance_price: Number(price) || null,
        full_name: form.name,
        document: cleanCpf,
        amount: Number(price),
        status: 'pending',
        team_name: form.team_name || null,
        emergency_contact: form.emergency_contact || null,
        blood_type: form.blood_type || null,
        medical_condition: form.medical_condition || null,
      }).select().single();

      if (insertError) throw insertError;
      trackRegistrationComplete(event.title, Number(price));
      localStorage.removeItem(LS_KEY);
      setRegistrationId(data.id);

      // Salvar termo de aceite com ID real da inscrição
      supabase.from('termo_aceites').insert({
        registration_id: data.id,
        user_id: user?.id || null,
        event_id: event.id,
        nome: form.name,
        cpf: form.cpf.replace(/\D/g, ''),
        data_nascimento: birthdateToISO(form.birthdate) || null,
        sexo: form.gender,
        distancia: chosen?.name || '',
        cidade: form.city,
        telefone: form.phone.replace(/\D/g, ''),
        email: form.email,
        equipe: form.team_name || null,
        ip_hint: 'browser',
        termo_versao: 'v1.0',
      }).catch(() => {});

      // Notificar organizador — EMAIL 4
      const { count: totalRegs } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .neq('status', 'cancelled');
      const { data: organizer } = await supabase
        .from('users')
        .select('email')
        .eq('id', event.organizer_id)
        .single();
      if (organizer?.email) {
        supabase.functions.invoke('send-email', {
          body: {
            templateType: 'organizador_nova_inscricao',
            recipientEmail: organizer.email,
            data: {
              eventTitle: event.title,
              athleteName: form.name,
              athleteEmail: form.email,
              distanceName: chosen?.name || '',
              amount: Number(price).toFixed(2).replace('.', ','),
              paymentStatus: 'pending',
              totalRegistrations: (totalRegs ?? 0) + 1,
            },
          },
        }).catch(() => {});
      }

      setStep('confirmação');
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar inscrição. Tente novamente.');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
    </div>
  );
  if (!event) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Evento não encontrado.</p></div>;

  const rawDistances: any[] = event.distances || [];
  const distances: any[] = rawDistances.length > 0 ? rawDistances : [{ name: 'Geral', price: 0, lots: [] }];
  const chosen = distances[form.distance_index] || distances[0];
  const chosenPrice = chosen?.lots?.[0]?.price ?? chosen?.price ?? 0;
  const currentStepIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link to={`/evento/${eventSlug}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-4">
          <ChevronLeft size={16} /> Voltar ao evento
        </Link>

        {/* Cabeçalho do evento */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-5 flex items-center gap-4">
          {event.banner_url && <img src={event.banner_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
          <div>
            <h1 className="font-bold text-gray-900">{event.title}</h1>
            <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {event.city}</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="bg-white rounded-xl border shadow-sm p-4 mb-5">
          <div className="flex items-center justify-between">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= currentStepIdx ? 'text-black' : 'bg-gray-100 text-gray-400'}`}
                    style={{ backgroundColor: i <= currentStepIdx ? '#C9A84C' : undefined }}>
                    {i < currentStepIdx ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${i <= currentStepIdx ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 mb-4" style={{ backgroundColor: i < currentStepIdx ? '#C9A84C' : '#e5e7eb' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {/* ETAPA 1: Dados */}
        {step === 'form' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Dados do Participante</h2>

            <Field label="Nome completo *"><input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Seu nome completo" /></Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="CPF *"><input className={inp} value={form.cpf} onChange={e => set('cpf', formatCPF(e.target.value))} placeholder="000.000.000-00" /></Field>
              <Field label="Data de Nascimento *"><input type="text" className={inp} value={form.birthdate} onChange={e => set('birthdate', formatBirthdate(e.target.value))} placeholder="DD/MM/AAAA" maxLength={10} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefone *"><input className={inp} value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(22) 99999-9999" /></Field>
              <Field label="E-mail *"><input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" /></Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade *"><input className={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Sua cidade" /></Field>
              <Field label="Sexo *">
                <select className={inp} value={form.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="O">Outro</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Tamanho da Camiseta *">
                <select className={inp} value={form.shirt_size} onChange={e => set('shirt_size', e.target.value)}>
                  <option value="">Selecione</option>
                  {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Distância *">
                <select className={inp} value={form.distance_index} onChange={e => set('distance_index', Number(e.target.value))}>
                  {distances.map((d: any, i: number) => (
                    <option key={i} value={i}>{d.name} — R$ {Number(d.lots?.[0]?.price ?? d.price ?? 0).toFixed(2).replace('.', ',')}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Novos campos */}
            <div className="border-t pt-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Informações Adicionais</p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Nome da equipe (opcional)"><input className={inp} value={form.team_name} onChange={e => set('team_name', e.target.value)} placeholder="Ex: Clube de Corrida" /></Field>
                <Field label="Tipo sanguíneo (opcional)">
                  <select className={inp} value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
                    <option value="">Selecione</option>
                    {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Contato de emergência (nome + telefone)">
                <input className={inp} value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Ex: Maria Silva — (22) 98888-7777" />
              </Field>

              <Field label="Condição médica relevante (opcional)">
                <textarea className={inp + ' resize-none'} rows={2} value={form.medical_condition} onChange={e => set('medical_condition', e.target.value)} placeholder="Alergias, condições cardíacas, uso de medicamentos..." />
              </Field>
            </div>

            <button onClick={handleNext} className="w-full font-bold py-3 rounded-xl text-lg mt-2 transition-colors" style={{ backgroundColor: '#C9A84C', color: '#000' }}>
              Avançar para o Termo →
            </button>
            <div className="mt-4">
              <SecurityBadges />
            </div>
          </div>
        )}

        {/* ETAPA 2: Termo */}
        {step === 'termo' && (
          <div className="space-y-4">
            {submitting ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#C9A84C' }} />
                <p className="text-gray-600">Salvando sua inscrição...</p>
              </div>
            ) : (
              <TermoResponsabilidade
                registration={{
                  id: 'pending',
                  name: form.name,
                  cpf: form.cpf,
                  birthdate: form.birthdate,
                  gender: form.gender,
                  distanceName: chosen?.name || '',
                  city: form.city,
                  phone: form.phone,
                  email: form.email,
                }}
                event={{ id: event.id, title: event.title }}
                userId={user?.id || ''}
                onAccepted={handleTermoAccepted}
              />
            )}
            <button onClick={() => setStep('form')} className="w-full border text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
              ← Voltar
            </button>
          </div>
        )}

        {/* ETAPA 3: Confirmação */}
        {step === 'confirmação' && registrationId && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#f0fdf4' }}>
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Inscrição registrada!</h2>
            <p className="text-gray-500 text-sm">Agora finalize o pagamento para confirmar sua vaga.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => navigate(`/pagamento/${registrationId}`)}
                className="w-full font-bold py-3 rounded-xl" style={{ backgroundColor: '#C9A84C', color: '#000' }}>
                💳 Ir para Pagamento
              </button>
              <button onClick={() => navigate(`/confirmacao/${registrationId}`)}
                className="w-full font-bold py-3 rounded-xl border" style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                Ver Confirmação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
