import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';
import { trackRegistrationStart, trackRegistrationComplete } from '../utils/analytics';

const SHIRT_SIZES = ['P', 'M', 'G', 'GG'];

function formatCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatPhone(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{4})$/, '$1-$2');
}

function generateRegistrationNumber() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `022-${year}-${rand}`;
}

export function RegistrationPage() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'summary'>('form');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: user?.name || '',
    cpf: '',
    birthdate: '',
    phone: '',
    email: user?.email || '',
    city: '',
    gender: '',
    shirt_size: '',
    distance_index: 0,
  });

  useEffect(() => {
    supabase.from('events').select('*').eq('slug', eventSlug).single()
      .then(({ data }) => { setEvent(data); if (data) trackRegistrationStart(data.title); setLoading(false); });
  }, [eventSlug]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.name.trim()) return 'Informe seu nome completo.';
    if (form.cpf.replace(/\D/g, '').length !== 11) return 'CPF inválido.';
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
    setStep('summary');
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const distances = event.distances || [];
      const chosen = distances[form.distance_index] || distances[0];
      const regNumber = generateRegistrationNumber();

      const { data, error: insertError } = await supabase.from('registrations').insert({
        event_id: event.id,
        user_id: user?.id || null,
        registration_number: regNumber,
        name: form.name,
        cpf: form.cpf.replace(/\D/g, ''),
        birthdate: form.birthdate,
        phone: form.phone.replace(/\D/g, ''),
        email: form.email,
        city: form.city,
        gender: form.gender,
        shirt_size: form.shirt_size,
        distance_name: chosen?.name,
        amount: chosen?.price || 0,
        status: 'pending',
      }).select().single();

      if (insertError) throw insertError;
      trackRegistrationComplete(event.title, chosen?.price || 0);
      navigate(`/confirmacao/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar inscrição. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Evento não encontrado.</p>
    </div>
  );

  const distances: any[] = event.distances || [];
  const chosen = distances[form.distance_index] || distances[0];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Link to={`/evento/${eventSlug}`} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mb-6">
          <ChevronLeft size={16} /> Voltar ao evento
        </Link>

        {/* Event header */}
        <div className="bg-white rounded-xl border shadow-sm p-5 mb-6 flex items-center gap-4">
          {event.banner_url && <img src={event.banner_url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
          <div>
            <h1 className="font-bold text-gray-900 text-lg">{event.title}</h1>
            <p className="text-sm text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · {event.city}</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

        {step === 'form' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Dados do Participante</h2>

            <Field label="Nome completo *">
              <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Seu nome completo" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="CPF *">
                <input className={inp} value={form.cpf} onChange={e => set('cpf', formatCPF(e.target.value))} placeholder="000.000.000-00" />
              </Field>
              <Field label="Data de Nascimento *">
                <input type="date" className={inp} value={form.birthdate} onChange={e => set('birthdate', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Telefone *">
                <input className={inp} value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))} placeholder="(22) 99999-9999" />
              </Field>
              <Field label="E-mail *">
                <input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Cidade *">
                <input className={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="Sua cidade" />
              </Field>
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
                    <option key={i} value={i}>{d.name} — R$ {Number(d.price).toFixed(2).replace('.', ',')}</option>
                  ))}
                </select>
              </Field>
            </div>

            <button onClick={handleNext}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors mt-4">
              Revisar Inscrição →
            </button>
          </div>
        )}

        {step === 'summary' && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Resumo da Inscrição</h2>

            <div className="space-y-3 mb-6">
              {[
                ['Participante', form.name],
                ['CPF', form.cpf],
                ['Data de Nascimento', form.birthdate ? new Date(form.birthdate + 'T00:00').toLocaleDateString('pt-BR') : ''],
                ['Telefone', form.phone],
                ['E-mail', form.email],
                ['Cidade', form.city],
                ['Sexo', form.gender === 'M' ? 'Masculino' : form.gender === 'F' ? 'Feminino' : 'Outro'],
                ['Camiseta', form.shirt_size],
                ['Distância', chosen?.name],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm border-b pb-2">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{val}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span className="text-blue-600">R$ {Number(chosen?.price || 0).toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('form')}
                className="flex-1 border text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-50">
                Voltar
              </button>
              <button onClick={handleConfirm} disabled={submitting}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Confirmando...</> : '✅ Confirmar Inscrição'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inp = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
