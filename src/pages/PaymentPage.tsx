import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getPixQrCode } from '../lib/asaas';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Clock, Copy, CreditCard, FileText, QrCode } from 'lucide-react';
import { SecurityBadges } from '../components/SecurityBadges';

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO';

interface PaymentResult {
  paymentId?: string;
  status?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  barCode?: string;
  qrCode?: string;
  qrCodeImage?: string;
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

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase.from('registrations').select('*').eq('id', registrationId).single();
      if (r) {
        setReg(r);
        const { data: e } = await supabase.from('events').select('*').eq('id', r.event_id).single();
        setEvent(e);
      }
      setLoading(false);
    }
    load();
  }, [registrationId]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secs = String(secondsLeft % 60).padStart(2, '0');
  const expired = secondsLeft <= 0;

  const handleCreatePayment = async () => {
    if (!reg || !event) return;
    setCreating(true);
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
      if (error) throw error;

      if (data?.paymentId && method === 'PIX') {
        const qrData = await getPixQrCode(data.paymentId as string);
        setPaymentResult({
          ...data,
          qrCode: qrData?.payload as string | undefined,
          qrCodeImage: qrData?.encodedImage as string | undefined,
        });
      } else {
        setPaymentResult(data);
      }
    } catch (e) {
      console.error('Erro ao criar pagamento:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPaid = async () => {
    await supabase.from('registrations').update({ status: 'paid' }).eq('id', registrationId);
    navigate(`/confirmacao/${registrationId}`);
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-5">

        {/* Resumo */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Pagamento</h1>
          <div className="space-y-2 text-sm">
            {[
              ['Evento', event.title as string],
              ['Distância', reg.distance_name as string],
              ['Participante', reg.name as string],
              ['Nº Inscrição', reg.registration_number as string],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">{l}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-bold text-lg">
              <span>Total</span>
              <span className="text-[#C9A84C]">R$ {Number(reg.amount).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div className={`rounded-xl p-4 flex items-center gap-3 ${expired ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <Clock size={20} className={expired ? 'text-red-500' : 'text-yellow-600'} />
          <div>
            <p className={`font-semibold text-sm ${expired ? 'text-red-600' : 'text-yellow-700'}`}>
              {expired ? 'Pagamento expirado' : `Expira em ${mins}:${secs}`}
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
              {([
                { id: 'PIX' as PaymentMethod, label: 'PIX', icon: QrCode },
                { id: 'CREDIT_CARD' as PaymentMethod, label: 'Cartão', icon: CreditCard },
                { id: 'BOLETO' as PaymentMethod, label: 'Boleto', icon: FileText },
              ] as const).map(({ id, label, icon: Icon }) => (
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
              ))}
            </div>
            <button
              onClick={handleCreatePayment}
              disabled={creating}
              className="w-full bg-[#C9A84C] text-white font-bold py-4 rounded-xl hover:bg-[#B8962E] disabled:opacity-50"
            >
              {creating
                ? 'Gerando pagamento...'
                : `Pagar com ${method === 'PIX' ? 'PIX' : method === 'CREDIT_CARD' ? 'Cartão' : 'Boleto'}`}
            </button>
          </div>
        )}

        {/* PIX QR Code */}
        {paymentResult && method === 'PIX' && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <h2 className="font-bold text-gray-900">Escaneie o QR Code PIX</h2>
            <div className="flex justify-center">
              {paymentResult.qrCodeImage ? (
                <img
                  src={`data:image/png;base64,${paymentResult.qrCodeImage}`}
                  alt="QR Code PIX"
                  className="w-48 h-48"
                />
              ) : paymentResult.qrCode ? (
                <QRCodeSVG value={paymentResult.qrCode} size={200} level="M" includeMargin />
              ) : null}
            </div>
            {paymentResult.qrCode && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Ou copie o código PIX:</p>
                <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                  <code className="flex-1 text-xs text-gray-700 text-left truncate">{paymentResult.qrCode}</code>
                  <button onClick={() => handleCopy(paymentResult.qrCode!)} className="text-[#C9A84C] flex-shrink-0">
                    {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            )}
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-[#B8962E] text-left space-y-1">
              <p className="font-semibold">Como pagar:</p>
              <p>1. Abra o app do seu banco</p>
              <p>2. Acesse PIX → Pagar com QR Code</p>
              <p>3. Escaneie ou cole o código acima</p>
              <p>4. Confirme o valor de R$ {Number(reg.amount).toFixed(2).replace('.', ',')}</p>
            </div>
            <p className="text-xs text-gray-400">O status será atualizado automaticamente após confirmação</p>
            <button onClick={handleConfirmPaid} className="w-full text-sm text-gray-500 underline">
              Já paguei — confirmar inscrição
            </button>
          </div>
        )}

        {/* Cartão */}
        {paymentResult && method === 'CREDIT_CARD' && paymentResult.invoiceUrl && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <CreditCard size={40} className="mx-auto text-[#C9A84C]" />
            <h2 className="font-bold text-gray-900">Pagamento com Cartão</h2>
            <p className="text-sm text-gray-500">Clique abaixo para ser redirecionado à página segura de pagamento Asaas.</p>
            <a
              href={paymentResult.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-[#C9A84C] text-white font-bold py-4 rounded-xl hover:bg-[#B8962E]"
            >
              Continuar para pagamento
            </a>
            <button onClick={handleConfirmPaid} className="w-full text-sm text-gray-500 underline">
              Já paguei — confirmar inscrição
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
            <button onClick={handleConfirmPaid} className="w-full text-sm text-gray-500 underline">
              Já paguei — confirmar inscrição
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
