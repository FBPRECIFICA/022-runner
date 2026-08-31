import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { trackRegistrationStart, trackRegistrationComplete } from '../utils/analytics';
import { validateCPF } from '../utils/validators';
import { TermoResponsabilidade } from '../components/TermoResponsabilidade';
import { AccountGate } from '../components/AccountGate';
import { SecurityBadges } from '../components/SecurityBadges';
import { isRegistrationOpen } from '../utils/registrationStatus';

const SHIRT_SIZES = ['P', 'M', 'G', 'GG'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não sei'];
const LS_KEY = 'reg_form_draft';
const LS_STEP_KEY = 'reg_form_step';

type Step = 'form' | 'termo' | 'conta' | 'confirmação';
const STEPS: Step[] = ['form', 'termo', 'conta', 'confirmação'];
const STEP_LABELS = ['1. Dados', '2. Termo', '3. Conta', '4. Confirmação'];

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
  const location = useLocation();
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  // Padrão definitivo: kit é sub-item da distância (event_distances -> registration_types),
  // nunca mais solto no evento nem embutido no texto da distância.
  const [eventDistances, setEventDistances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [pendingDup, setPendingDup] = useState<{ id: string; status: string; asaas_payment_id: string | null } | null>(null);

  const [form, setForm] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || defaultForm(user); }
    catch { return defaultForm(user); }
  });

  function defaultForm(u: any) {
    return {
      name: u?.name || '', cpf: '', birthdate: '', phone: '', email: u?.email || '',
      city: '', gender: '', shirt_size: '', distance_index: 0, kit_index: 0,
      team_name: '', emergency_contact: '', blood_type: '', medical_condition: '',
    };
  }

  useEffect(() => {
    supabase.from('events').select('*')
      .eq('slug', eventSlug).single()
      .then(async ({ data }) => {
        if (data) {
          // ver mesmo comentário em EventDetailPage.tsx — registrations não é
          // visível pra anon via embed, só via essa RPC.
          const { data: count } = await supabase.rpc('get_event_confirmed_count', { p_event_id: data.id });
          data = { ...data, registrations: [{ count: count ?? 0 }] };
        }
        setEvent(data);
        if (data) {
          trackRegistrationStart(data.title);
          supabase.from('event_distances').select('*, registration_types(*)').eq('event_id', data.id).order('sort_order')
            .then(({ data: dists }) => {
              const sorted = (dists || []).map((d: any) => ({
                ...d,
                registration_types: [...(d.registration_types || [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
              }));
              setEventDistances(sorted);
            });
        }
        setLoading(false);
      });
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

  // Restaura o passo "conta" após reload/retorno do redirect do Google OAuth
  useEffect(() => {
    if (localStorage.getItem(LS_STEP_KEY) === 'conta') setStep('conta');
  }, []);

  // Ponto único de convergência: login por senha, cadastro por senha ou volta do Google
  // OAuth passam todos por aqui — é o AuthContext.user virar truthy que dispara o avanço,
  // nunca uma chamada direta do AccountGate (login()/register() resolver não garante que
  // o contexto já populou `user`, isso acontece de forma assíncrona via onAuthStateChange).
  useEffect(() => {
    if (step === 'conta' && user && !submitting) {
      finalizeRegistration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user]);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  // Kit/distância pré-selecionados ao vir do botão "INSCREVER" de um card específico na página do evento.
  useEffect(() => {
    const state = location.state as { kitIndex?: number; distanceIndex?: number } | null;
    if (!state) return;
    if (typeof state.distanceIndex === 'number') set('distance_index', state.distanceIndex);
    if (typeof state.kitIndex === 'number') set('kit_index', state.kitIndex);
  }, [location.state]);

  // Distância → kit, nessa ordem (padrão definitivo). Camiseta só é exigida
  // quando o kit escolhido inclui camiseta (Kit Completo; Kit Econômico nunca mostra o campo).
  const chosenDistance = eventDistances[form.distance_index] || eventDistances[0];
  const kits: any[] = chosenDistance?.registration_types || [];
  const chosenKit = kits[form.kit_index] || kits[0];
  const shirtRequired = chosenKit ? chosenKit.includes_shirt !== false : true;

  const validate = () => {
    if (!form.name.trim()) return 'Informe seu nome completo.';
    if (!validateCPF(form.cpf)) return 'CPF inválido. Verifique os dígitos.';
    if (!form.birthdate) return 'Informe sua data de nascimento.';
    if (form.phone.replace(/\D/g, '').length < 10) return 'Telefone inválido.';
    if (!form.email.trim()) return 'Informe seu e-mail.';
    if (!form.city.trim()) return 'Informe sua cidade.';
    if (!form.gender) return 'Selecione o sexo.';
    if (shirtRequired && !form.shirt_size) return 'Selecione o tamanho da camiseta.';
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
      // Proteção contra inscrição duplicada pelo mesmo CPF no mesmo evento.
      // Via RPC (check_cpf_registration, SECURITY DEFINER) e não SELECT direto
      // na tabela: `registrations` não tem policy de SELECT pra anon, e essa
      // checagem roda ANTES do login (ver proceedToAccountOrFinalize) — um
      // SELECT direto sempre voltaria vazio aqui, que foi exatamente a causa
      // dos 7 pares duplicados na Corrida Solidária (2026-08-26).
      const cleanCpf = form.cpf.replace(/\D/g, '');
      const { data: existingRegs } = await supabase
        .rpc('check_cpf_registration', { p_event_id: event.id, p_cpf: cleanCpf });
      const existingReg = existingRegs?.[0];
      if (existingReg) {
        if (existingReg.status === 'paid' || existingReg.status === 'confirmed') {
          setError('Você já está inscrito e com pagamento confirmado!');
        } else {
          setPendingDup(existingReg);
        }
        localStorage.removeItem(LS_STEP_KEY);
        setStep('form');
        setSubmitting(false);
        return;
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar inscrição. Tente novamente.');
      setStep('form');
      setSubmitting(false);
      return;
    }

    await proceedToAccountOrFinalize();
  };

  // Sem conta: pausa aqui e pede login/cadastro antes de gravar a inscrição —
  // garante que user_id nunca nasça nulo. Com conta: segue direto.
  const proceedToAccountOrFinalize = async () => {
    if (user) {
      await finalizeRegistration();
    } else {
      localStorage.setItem(LS_STEP_KEY, 'conta');
      setStep('conta');
      setSubmitting(false);
    }
  };

  // Cancela a inscrição pendente antiga (mesmo CPF/evento) e segue com a nova —
  // dá à pessoa um jeito de trocar de kit sozinha, sem precisar de suporte.
  const handleCancelPendingAndRetry = async () => {
    if (!pendingDup || pendingDup.asaas_payment_id) return;
    setSubmitting(true);
    setError('');
    try {
      // .select() de volta é proposital: sem isso, um UPDATE bloqueado pela
      // RLS (ex: já existe cobrança Asaas) afeta 0 linhas sem gerar erro, e
      // seguiríamos como se tivesse cancelado — criando uma inscrição nova
      // duplicada em vez de bloquear.
      const { data: cancelled, error: cancelError } = await supabase
        .from('registrations')
        .update({ status: 'cancelled' })
        .eq('id', pendingDup.id)
        .eq('status', 'pending')
        .select('id');
      if (cancelError) throw cancelError;
      if (!cancelled || cancelled.length === 0) throw new Error('Não foi possível cancelar a inscrição pendente.');
      setPendingDup(null);
      await proceedToAccountOrFinalize();
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar inscrição pendente. Tente novamente.');
      setSubmitting(false);
    }
  };

  const handleAccountBack = () => {
    localStorage.removeItem(LS_STEP_KEY);
    setStep('termo');
  };

  const finalizeRegistration = async () => {
    if (!user) return;
    setSubmitting(true);
    setError('');
    try {
      // Padrão definitivo: distância → kit, valor cobrado vem sempre do kit escolhido.
      const chosenDistance = eventDistances[form.distance_index] || eventDistances[0];
      const kits: any[] = chosenDistance?.registration_types || [];
      const chosenKit = kits[form.kit_index] || kits[0];
      const finalPrice = Number(chosenKit?.price ?? 0);
      const isFree = finalPrice === 0;
      const platformFee = Math.round(finalPrice * 0.10 * 100) / 100;
      const cleanCpf = form.cpf.replace(/\D/g, '');

      // registration_number gerado atomicamente pelo trigger trg_auto_registration_number no banco
      const { data, error: insertError } = await supabase.from('registrations').insert({
        event_id: event.id,
        user_id: user.id,
        name: form.name,
        cpf: cleanCpf,
        birth_date: birthdateToISO(form.birthdate) || null,
        phone: form.phone.replace(/\D/g, ''),
        email: form.email,
        city: form.city,
        gender: form.gender,
        shirt_size: shirtRequired ? form.shirt_size : null,
        distance_name: chosenDistance?.name || null,
        distance_price: null,
        registration_type_id: chosenKit?.id || null,
        registration_type_name: chosenKit?.name || null,
        registration_type_price: chosenKit ? Number(chosenKit.price) : null,
        full_name: form.name,
        document: cleanCpf,
        base_amount: finalPrice,
        platform_fee: platformFee,
        discount_amount: 0,
        amount: finalPrice + platformFee,
        status: isFree ? 'confirmed' : 'pending',
        team_name: form.team_name || null,
        emergency_contact: form.emergency_contact || null,
        blood_type: form.blood_type || null,
        medical_condition: form.medical_condition || null,
      }).select().single();

      if (insertError) throw insertError;
      trackRegistrationComplete(event.title, finalPrice);
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_STEP_KEY);
      setRegistrationId(data.id);

      // Salvar termo de aceite — non-blocking: não interrompe fluxo se falhar
      try {
        await supabase.from('termo_aceites').insert({
          registration_id: data.id,
          user_id: user.id,
          event_id: event.id,
          nome: form.name,
          cpf: form.cpf.replace(/\D/g, ''),
          data_nascimento: birthdateToISO(form.birthdate) || null,
          sexo: form.gender,
          distancia: chosenDistance?.name || '',
          cidade: form.city,
          telefone: form.phone.replace(/\D/g, ''),
          email: form.email,
          equipe: form.team_name || null,
          ip_hint: 'browser',
          termo_versao: 'v1.0',
        });
      } catch (termoErr) {
        console.error('Erro ao registrar termo_aceites (não bloqueante):', termoErr);
      }

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
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              templateType: 'organizador_nova_inscricao',
              recipientEmail: organizer.email,
              data: {
                eventTitle: event.title,
                athleteName: form.name,
                athleteEmail: form.email,
                distanceName: chosenDistance?.name || '',
                amount: finalPrice.toFixed(2).replace('.', ','),
                paymentStatus: isFree ? 'confirmed' : 'pending',
                totalRegistrations: (totalRegs ?? 0) + 1,
              },
            },
          });
        } catch (emailErr) {
          console.error('Erro ao notificar organizador (não bloqueante):', emailErr);
        }
      }

      // Evento gratuito: não passa pelo asaas-webhook, então o e-mail de confirmação
      // do atleta (normalmente disparado por lá) precisa ser mandado direto aqui.
      if (isFree) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              templateType: 'atleta_confirmacao',
              recipientEmail: form.email,
              data: {
                athleteName: form.name,
                eventTitle: event.title ?? '',
                eventDate: event.date ? new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '',
                eventCity: event.city ?? '',
                distanceName: chosenDistance?.name || '',
                registrationNumber: data.registration_number,
                amount: '0,00',
                baseAmount: '0,00',
                platformFee: '0,00',
                discountAmount: '0,00',
                couponCode: '',
              },
            },
          });
        } catch (emailErr) {
          console.error('Erro ao enviar confirmação de inscrição gratuita (não bloqueante):', emailErr);
        }
      }

      setStep('confirmação');
    } catch (err: any) {
      // 23505 = trava UNIQUE(event_id, cpf) no banco (registrations_event_cpf_unique_idx)
      // — rede de segurança pro caso raro de duas tentativas simultâneas passarem
      // pela checagem via RPC acima antes de qualquer uma delas terminar de gravar.
      const message = err?.code === '23505'
        ? 'Esse CPF já está inscrito nesse evento.'
        : (err.message || 'Erro ao salvar inscrição. Tente novamente.');
      setError(message);
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
  if (!isRegistrationOpen(event, event.registrations?.[0]?.count ?? 0)) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-gray-700 font-bold text-lg">Inscrições encerradas para {event.title}.</p>
      <Link to={`/evento/${event.slug}`} className="text-[#C9A84C] font-semibold underline">Voltar para o evento</Link>
    </div>
  );
  if (eventDistances.length === 0) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Nenhuma distância disponível para inscrição neste evento ainda.</p></div>;

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
              <Field label="Distância *">
                <select className={inp} value={form.distance_index} onChange={e => {
                  set('distance_index', Number(e.target.value));
                  set('kit_index', 0);
                }}>
                  {eventDistances.map((d: any, i: number) => <option key={i} value={i}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Kit *">
                <select className={inp} value={form.kit_index} onChange={e => set('kit_index', Number(e.target.value))}>
                  {kits.map((k: any, i: number) => (
                    <option key={i} value={i}>{k.name} — R$ {Number(k.price).toFixed(2).replace('.', ',')}</option>
                  ))}
                </select>
              </Field>
            </div>

            {shirtRequired && (
              <Field label="Tamanho da Camiseta *">
                <select className={inp} value={form.shirt_size} onChange={e => set('shirt_size', e.target.value)}>
                  <option value="">Selecione</option>
                  {SHIRT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            )}

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
                  distanceName: chosenDistance?.name || '',
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

        {/* ETAPA 3: Conta */}
        {step === 'conta' && (
          <div className="space-y-4">
            {submitting ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <Loader2 size={32} className="animate-spin mx-auto mb-3" style={{ color: '#C9A84C' }} />
                <p className="text-gray-600">Salvando sua inscrição...</p>
              </div>
            ) : (
              <AccountGate defaultName={form.name} defaultEmail={form.email} onBack={handleAccountBack} />
            )}
          </div>
        )}

        {/* ETAPA 4: Confirmação */}
        {step === 'confirmação' && registrationId && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#f0fdf4' }}>
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Inscrição registrada!</h2>
            <p className="text-gray-500 text-sm">
              {Number(chosenKit?.price ?? 0) === 0
                ? 'Este é um evento gratuito — sua vaga já está confirmada, sem pagamento.'
                : 'Agora finalize o pagamento para confirmar sua vaga.'}
            </p>
            <div className={`grid grid-cols-1 gap-3 ${Number(chosenKit?.price ?? 0) > 0 ? 'sm:grid-cols-2' : ''}`}>
              {Number(chosenKit?.price ?? 0) > 0 && (
                <button onClick={() => navigate(`/pagamento/${registrationId}`)}
                  className="w-full font-bold py-3 rounded-xl" style={{ backgroundColor: '#C9A84C', color: '#000' }}>
                  💳 Ir para Pagamento
                </button>
              )}
              <button onClick={() => navigate(`/confirmacao/${registrationId}`)}
                className="w-full font-bold py-3 rounded-xl border" style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                Ver Confirmação
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: inscrição pendente já existente com o mesmo CPF */}
      {pendingDup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setPendingDup(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: '#fef9ec' }}>
              <span className="text-2xl">⏳</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">Inscrição pendente encontrada</h3>
            <p className="text-sm text-gray-500">
              Você já tem uma inscrição pendente para este evento. Deseja continuar o pagamento dela{pendingDup.asaas_payment_id ? '' : ' ou cancelar e se inscrever de novo (ex: para trocar o kit)'}?
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => navigate(`/pagamento/${pendingDup.id}`)}
                className="w-full font-bold py-3 rounded-xl" style={{ backgroundColor: '#C9A84C', color: '#000' }}>
                💳 Continuar Pagamento da Pendente
              </button>
              {pendingDup.asaas_payment_id ? (
                <p className="text-xs text-gray-400">
                  Essa pendente já tem uma cobrança gerada, então não dá pra cancelar por aqui. Se quiser trocar de kit mesmo assim, fale com o suporte.
                </p>
              ) : (
                <button onClick={handleCancelPendingAndRetry} disabled={submitting}
                  className="w-full border font-medium py-2.5 rounded-xl disabled:opacity-50" style={{ borderColor: '#C9A84C', color: '#8a6d1f' }}>
                  {submitting ? 'Cancelando...' : '🔄 Cancelar Pendente e Fazer Nova Inscrição'}
                </button>
              )}
              <button onClick={() => setPendingDup(null)} disabled={submitting} className="w-full border text-gray-600 py-2.5 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]';

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
