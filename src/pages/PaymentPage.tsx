import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Clock, Copy, CreditCard, FileText, QrCode } from 'lucide-react';
import { SecurityBadges } from '../components/SecurityBadges';

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

interface PixQrCode {
  encodedImage?: string | null;
  payload?: string | null;
  expirationDate?: string | null;
}

interface PaymentResult {
  paymentId?: string;
  status?: string;
  paymentLink?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  barCode?: string;
  pixQrCode?: PixQrCode;
}

export function PaymentPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();

  const [reg, setReg] = useState<Record<string, unknown> | null>(null);
  const [event, setEvent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30 * 60);
  const [polling, setPolling] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const expired = useMemo(() => secondsLeft <= 0, [secondsLeft]);
  const mins = useMemo(() => String(Math.floor(secondsLeft / 60)).padStart(2, '0'), [secondsLeft]);
  const secs = useMemo(() => String(secondsLeft % 60).padStart(2, '0'), [secondsLeft]);

  useEffect(() => {
    async function load() {
      const { data: regData } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', registrationId)
        .single();
      if (regData) {
        setReg(regData);
        const { data: evData } = await supabase
          .from('events')
          .select('*')
          .eq('id', regData.event_id)
          .single();
        setEvent(evData);
      }
      setLoading(false);
    }
    load();
  }, [registrationId]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timerId = setInterval(() => setSecondsLeft(prev => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [secondsLeft]);

  useEffect(() => {
    if (!paymentResult || method !== 'PIX' || expired) return;
    setPolling(true);
    const intervalId = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('registrations')
          .select('status')
          .eq('id', registrationId)
          .single();
        if (data?.status === 'paid') {
          clearInterval(intervalId);
          setPolling(false);
          navigate(`/confirmacao/${registrationId}`);
        }
      } catch (_) {
        // silent — keep polling
      }
    }, 5000);
    return () => {
      clearInterval(intervalId);
      setPolling(false);
    };
  }, [paymentResult, method, expired, registrationId, navigate]);

  const handleCreatePayment = async () => {
    if (!reg || !event) return;
    setCreating(true);
    setPayError(null);
    try {
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          registrationId,
          billingType: method,
          customerData: {
            name: reg.name,
            email: reg.email,
            cpfCnpj: (reg.cpf as string) || '00000000000',
            phone: reg.phone,
          },
          paymentData: {
            value: Number(reg.amount),
            dueDate,
            description: `Inscrição - ${event.title}`,
          },
        },
      });
      if (error) throw new Error(String(error.message ?? error));
      setPaymentResult(data as PaymentResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Erro ao criar pagamento:', msg);
      setPayError(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // fallback silencioso
    }
  };

  const handleVerifyPayment = async () => {
    const { data } = await supabase
      .from('registrations')
      .select('status')
      .eq('id', registrationId)
      .single();
    if (data?.status === 'paid') {
      navigate(`/confirmacao/${registrationId}`);
    }
  };

  const handleConfirmPaid = async () => {
    await supabase
      .from('registrations')
      .update({ status: 'paid' })
      .eq('id', registrationId);
    navigate(`/confirmacao/${registrationId}`);
  };

  const pixImage = paymentResult?.pixQrCode?.encodedImage;
  const pixPayload = paymentResult?.pixQrCode?.payload;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
      </div>
    );
  }

  if (!reg || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Inscrição não encontrada.</p>
      </div>
    );
  }

  const summaryRows: [string, string][] = [
    ['Evento', String(event.title ?? '')],
    ['Distância', String(reg.distance_name ?? '')],
    ['Participante', String(reg.name ?? '')],
    ['Nº Inscrição', String(reg.registration_number ?? '')],
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-5">

        {/* Resumo */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Pagamento</h1>
          <div className="space-y-2 text-sm">
            {summaryRows.map(([label, value]) => (
              <div key={label} className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-900">{value}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-bold text-lg">
              <span>Total</span>
              <span className="text-[#C9A84C]">
                R$ {Number(reg.amount).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className={`rounded-xl p-4 flex items-center gap-3 ${expired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <Clock size={20} className={expired ? 'text-red-500' : 'text-yellow-600'} />
          <div>
            <p className={`font-semibold text-sm ${expired ? 'text-red-600' : 'text-yellow-700'}`}>
              {expired ? 'Sessão expirada' : `Expira em ${mins}:${secs}`}
            </p>
            <p className="text-xs text-gray-500">Sua vaga está reservada por 30 minutos</p>
          </div>
        </div>

        {/* Selos de segurança */}
        <SecurityBadges />

        {/* Seleção de método */}
        {!paymentResult && !expired && (
          <div className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-900">Escolha a forma de pagamento</h2>
            <div className="grid grid-cols-3 gap-3">
              {(['PIX', 'CREDIT_CARD', 'BOLETO'] as const).map((id) => {
                const Icon = id === 'PIX' ? QrCode : id === 'CREDIT_CARD' ? CreditCard : FileText;
                const label = id === 'PIX' ? 'PIX' : id === 'CREDIT_CARD' ? 'Cartão' : 'Boleto';
                return (
                  <button
                    key={id}
                    onClick={() => setMethod(id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      method === id ? 'border-[#C9A84C] bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={24} className={method === id ? 'text-[#C9A84C]' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${method === id ? 'text-[#C9A84C]' : 'text-gray-600'}`}>{label}</span>
                  </button>
                );
              })}
            </div>
            {payError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                Erro: {payError}
              </div>
            )}
            <button
              onClick={handleCreatePayment}
              disabled={creating}
              className="w-full bg-[#C9A84C] text-white font-bold py-4 rounded-xl hover:bg-[#B8962E] disabled:opacity-50"
            >
              {creating
                ? 'Gerando pagamento...'
                : `Pagar com ${method === 'PIX' ? 'PIX' : method === 'CREDIT_CARD' ? 'Cartão de Crédito' : 'Boleto'}`}
            </button>
          </div>
        )}

        {/* PIX QR Code */}
        {paymentResult && method === 'PIX' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <h2 className="font-bold text-gray-900">Escaneie o QR Code PIX</h2>

            {pixImage ? (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pixImage}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 border rounded-lg"
                />
              </div>
            ) : pixPayload ? (
              <div className="flex justify-center">
                <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-gray-50">
                  <QrCode size={64} className="text-gray-300" />
                </div>
              </div>
            ) : null}

            {pixPayload && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Código PIX copiável:</p>
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <code className="flex-1 text-xs text-gray-700 text-left truncate">{pixPayload}</code>
                  <button onClick={() => handleCopy(pixPayload)} className="text-[#C9A84C] flex-shrink-0">
                    {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <button
                  onClick={() => handleCopy(pixPayload)}
                  className="w-full text-sm font-semibold border border-[#C9A84C] text-[#C9A84C] py-2 rounded-lg hover:bg-amber-50 flex items-center justify-center gap-2"
                >
                  <Copy size={14} /> {copied ? 'Copiado!' : 'Copiar código PIX'}
                </button>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-3 text-xs text-[#B8962E] text-left">
              Abra o app do seu banco, escaneie o QR Code ou cole o código PIX.
              O pagamento é confirmado automaticamente em instantes.
            </div>

            {polling && !expired && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C9A84C]" />
                Aguardando confirmação do pagamento...
              </div>
            )}

            {expired && (
              <p className="text-sm text-red-500 font-medium">Sessão expirada. Recarregue a página para gerar um novo PIX.</p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleVerifyPayment}
                className="w-full text-sm font-semibold bg-green-600 text-white py-3 rounded-xl hover:bg-green-700"
              >
                Já paguei — verificar agora
              </button>
              <button onClick={handleConfirmPaid} className="w-full text-xs text-gray-400 underline">
                Confirmar manualmente
              </button>
            </div>
          </div>
        )}

        {/* Cartão */}
        {paymentResult && method === 'CREDIT_CARD' && paymentResult.invoiceUrl && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <CreditCard size={40} className="mx-auto text-[#C9A84C]" />
            <h2 className="font-bold text-gray-900">Pagamento com Cartão</h2>
            <p className="text-sm text-gray-500">Clique abaixo para a página segura de pagamento Asaas.</p>
            <a
              href={paymentResult.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#C9A84C] text-white font-bold py-4 rounded-xl hover:bg-[#B8962E]"
            >
              Continuar para pagamento
            </a>
            <button onClick={handleVerifyPayment} className="w-full text-sm text-gray-500 underline">
              Já paguei — verificar agora
            </button>
          </div>
        )}

        {/* Boleto */}
        {paymentResult && method === 'BOLETO' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 space-y-4">
            <h2 className="font-bold text-gray-900 text-center">Boleto Bancário</h2>
            {paymentResult.bankSlipUrl && (
              <a
                href={paymentResult.bankSlipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#C9A84C] text-white font-bold py-4 rounded-xl hover:bg-[#B8962E] text-center"
              >
                Visualizar e Imprimir Boleto
              </a>
            )}
            {paymentResult.barCode && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Código de barras:</p>
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <code className="flex-1 text-xs text-gray-700 text-left truncate">{paymentResult.barCode}</code>
                  <button onClick={() => handleCopy(paymentResult.barCode!)} className="text-[#C9A84C] flex-shrink-0">
                    {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 text-center">
              Vencimento: {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
            </p>
            <button onClick={handleVerifyPayment} className="w-full text-sm text-gray-500 underline">
              Já paguei — verificar agora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
