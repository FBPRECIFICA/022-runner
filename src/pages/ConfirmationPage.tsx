import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, Share2, Download, Home, MessageCircle } from 'lucide-react';
import { confirmationMessage } from '../utils/whatsappNotifier';

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
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
    </div>
  );

  if (!reg || !event) return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-gray-500">Inscrição não encontrada.</p>
      <Link to="/" className="mt-4 text-[#C9A84C] hover:underline">Voltar ao início</Link>
    </div>
  );

  const shareUrl = `${window.location.origin}/evento/${event.slug}`;
  const whatsappMsg = encodeURIComponent(`Acabei de me inscrever no ${event.title}! 🏃 Venha correr também: ${shareUrl}`);
  const qrValue = `${window.location.origin}/confirmacao/${registrationId}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrValue)}`;

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-${reg.registration_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryRows: [string, string][] = [
    ['Evento', event.title],
    ['Data', new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })],
    ['Horário', new Date(event.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })],
    ['Local', `${event.location} — ${event.city}`],
    ['Distância', reg.distance_name],
    ['Valor', `R$ ${Number(reg.amount).toFixed(2).replace('.', ',')}`],
    ['Status', reg.status === 'pending' ? '⏳ Aguardando Pagamento' : '✅ Confirmado'],
  ];

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
          <div className="rounded-2xl px-8 py-6 mt-2" style={{ background: '#111', border: '2px solid #C9A84C' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>SEU NÚMERO DE PEITO</p>
            <p className="text-6xl font-black font-mono" style={{ color: '#C9A84C' }}>#{reg.registration_number}</p>
            <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>Apresente este número no check-in do evento</p>
          </div>
        </div>

        {/* Detalhes do evento */}
        <div className="bg-white rounded-xl border shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-gray-900">Detalhes do Evento</h2>
          {summaryRows.map(([label, value]) => (
            <div key={label} className="flex justify-between text-sm border-b pb-2 last:border-0">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900 text-right">{value}</span>
            </div>
          ))}
        </div>

        {/* Aguardando Pagamento */}
        {reg.status === 'pending' && (
          <div className="bg-white rounded-xl border shadow-sm p-5 text-center space-y-3">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-semibold">⚡ Aguardando Pagamento</p>
              <p className="mt-1">Finalize o pagamento para garantir sua vaga no evento.</p>
            </div>
            <Link
              to={`/pagamento/${registrationId}`}
              className="block w-full bg-[#C9A84C] text-black font-bold py-3 rounded-xl hover:bg-[#B8962E] text-sm"
            >
              💳 Ir para Pagamento
            </Link>
          </div>
        )}

        {/* QR Code */}
        <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col items-center gap-3">
          <h2 className="font-bold text-gray-900">QR Code da Inscrição</h2>
          <img src={qrSrc} alt="QR Code da inscrição" width={160} height={160} className="rounded-lg" />
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
            style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
            <Download size={16} /> Baixar Comprovante
          </button>
        </div>

        {/* WhatsApp confirmação */}
        <a
          href={`https://wa.me/?text=${encodeURIComponent(confirmationMessage(event.title, new Date(event.date).toLocaleDateString('pt-BR'), reg.registration_number))}`}
          target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 rounded-xl hover:bg-green-600 transition-colors text-sm"
        >
          <MessageCircle size={18} /> Receber confirmação no WhatsApp
        </a>

        <Link to="/" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-800 text-sm py-2">
          <Home size={16} /> Voltar ao início
        </Link>
      </div>
    </div>
  );
}
