import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle, Clock, Copy } from 'lucide-react';

const PIX_KEY = '022runner@pagamentos.com.br';
const EXPIRY_SECONDS = 30 * 60;

export function PaymentPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const navigate = useNavigate();
  const [reg, setReg] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase.from('registrations').select('*').eq('id', registrationId).single();
      if (r) { setReg(r); const { data: e } = await supabase.from('events').select('*').eq('id', r.event_id).single(); setEvent(e); }
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

  const handleCopy = async () => {
    await navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    await supabase.from('registrations').update({ status: 'confirmed' }).eq('id', registrationId);
    navigate(`/confirmacao/${registrationId}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

  if (!reg || !event) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Inscrição não encontrada.</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* Resumo */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Pagamento via PIX</h1>
          <div className="space-y-2 text-sm">
            {[
              ['Evento', event.title],
              ['Distância', reg.distance_name],
              ['Participante', reg.name],
              ['Nº Inscrição', reg.registration_number],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between border-b pb-1.5">
                <span className="text-gray-500">{l}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-bold text-lg">
              <span>Total</span>
              <span className="text-blue-600">R$ {Number(reg.amount).toFixed(2).replace('.', ',')}</span>
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

        {/* QR Code PIX */}
        {!expired && (
          <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-4">
            <h2 className="font-bold text-gray-900">Escaneie o QR Code</h2>
            <div className="flex justify-center">
              <QRCodeSVG value={`PIX:${PIX_KEY}:${reg.amount}`} size={200} level="M" includeMargin />
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-2">Ou copie a chave PIX:</p>
              <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
                <code className="flex-1 text-sm text-gray-700 text-left truncate">{PIX_KEY}</code>
                <button onClick={handleCopy} className="text-blue-600 hover:text-blue-800 flex-shrink-0">
                  {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 text-left space-y-1">
              <p className="font-semibold">Como pagar:</p>
              <p>1. Abra o app do seu banco</p>
              <p>2. Acesse PIX → Pagar com QR Code</p>
              <p>3. Escaneie ou cole a chave acima</p>
              <p>4. Confirme o valor de R$ {Number(reg.amount).toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        )}

        {/* Simular aprovação */}
        <button
          onClick={handleSimulate}
          disabled={simulating || expired}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CheckCircle size={20} />
          {simulating ? 'Processando...' : '✅ Simular Pagamento Aprovado'}
        </button>
      </div>
    </div>
  );
}
