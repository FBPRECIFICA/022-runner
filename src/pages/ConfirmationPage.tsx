import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Share2, Download, Home } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export function ConfirmationPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [reg, setReg] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );

  if (!reg || !event) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-gray-500">Inscrição não encontrada.</p>
      <Link to="/" className="mt-4 text-blue-600 hover:underline">Voltar ao início</Link>
    </div>
  );

  const shareUrl = `${window.location.origin}/evento/${event.slug}`;
  const whatsappMsg = encodeURIComponent(`Acabei de me inscrever no ${event.title}! 🏃 Venha correr também: ${shareUrl}`);
  const qrValue = `${window.location.origin}/confirmacao/${registrationId}`;

  const handleDownload = () => {
    const lines = [
      '=== COMPROVANTE DE INSCRIÇÃO ===',
      `Nº Inscrição: ${reg.registration_number}`,
      `Evento: ${event.title}`,
      `Data: ${new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      `Local: ${event.location} — ${event.city}`,
      `Distância: ${reg.distance_name}`,
      `Valor: R$ ${Number(reg.amount).toFixed(2).replace('.', ',')}`,
      `Participante: ${reg.name}`,
      `CPF: ${reg.cpf}`,
      `Status: ${reg.status === 'pending' ? 'Aguardando Pagamento' : 'Confirmado'}`,
      `Data Inscrição: ${new Date(reg.created_at).toLocaleDateString('pt-BR')}`,
    ].join('\n');
    const blob = new Blob([lines], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `comprovante-${reg.registration_number}.txt`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-xl mx-auto px-4 space-y-5">
        {/* Confirmação */}
        <div className="bg-white rounded-2xl border shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Inscrição Realizada!</h1>
          <p className="text-gray-500 text-sm mb-4">Você está inscrito. Aguarde a confirmação do pagamento.</p>
          <div className="inline-block bg-gray-50 border rounded-xl px-6 py-3">
            <p className="text-xs text-gray-400 mb-1">Número da Inscrição</p>
            <p className="text-2xl font-mono font-bold" style={{ color: '#C9A84C' }}>{reg.registration_number}</p>
          </div>
        </div>

        {/* Detalhes do evento */}
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-gray-900">Detalhes do Evento</h2>
          {[
            ['Evento', event.title],
            ['Data', new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })],
            ['Horário', new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
            ['Local', `${event.location} — ${event.city}`],
            ['Distância', reg.distance_name],
            ['Valor', `R$ ${Number(reg.amount).toFixed(2).replace('.', ',')}`],
            ['Status', reg.status === 'pending' ? '⏳ Aguardando Pagamento' : '✅ Confirmado'],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between text-sm border-b pb-2 last:border-0">
              <span className="text-gray-500">{l}</span>
              <span className="font-medium text-gray-900 text-right">{v}</span>
            </div>
          ))}
        </div>

        {/* Aguardando Pagamento PIX */}
        {reg.status === 'pending' && (
          <div className="bg-white rounded-xl border shadow-sm p-5 text-center">
            <h2 className="font-bold text-gray-900 mb-3">Pagamento via PIX</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-semibold">⚡ Aguardando Pagamento</p>
              <p className="mt-1">Em breve você receberá o QR Code do PIX por e-mail. Sua vaga fica reservada por 24h.</p>
            </div>
          </div>
        )}

        {/* QR Code */}
        <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col items-center gap-3">
          <h2 className="font-bold text-gray-900">QR Code da Inscrição</h2>
          <QRCodeSVG value={qrValue} size={160} level="M" includeMargin />
          <p className="text-xs text-gray-400">Apresente este código no dia do evento</p>
        </div>

        {/* Ações */}
        <div className="grid grid-cols-2 gap-3">
          <a href={`https://wa.me/?text=${whatsappMsg}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition-colors text-sm">
            <Share2 size={16} /> Compartilhar no WhatsApp
          </a>
          <button onClick={handleDownload}
            className="flex items-center justify-center gap-2 border-2 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            style={{ borderColor: '#2563EB', color: '#2563EB' }}>
            <Download size={16} /> Baixar Comprovante
          </button>
        </div>

        <Link to="/" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-800 text-sm py-2">
          <Home size={16} /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}
