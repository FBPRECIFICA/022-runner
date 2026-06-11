import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Share2 } from 'lucide-react';

export function CertificatePage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const [reg, setReg] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: r } = await supabase.from('registrations').select('*').eq('id', registrationId).single();
      if (r) { setReg(r); const { data: e } = await supabase.from('events').select('*').eq('id', r.event_id).single(); setEvent(e); }
      setLoading(false);
    }
    load();
  }, [registrationId]);

  const handlePrint = () => window.print();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" /></div>;
  if (!reg || !event) return <div className="min-h-screen flex items-center justify-center text-gray-500">Certificado não encontrado.</div>;

  const eventDate = new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const shareMsg = encodeURIComponent(`🏅 Participei do ${event.title}! ${eventDate} — ${event.city}/RJ. Nº ${reg.registration_number}`);
  const qrValue = `${window.location.origin}/certificado/${registrationId}`;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .certificate { box-shadow: none !important; }
        }
      `}</style>

      {/* Botões */}
      <div className="no-print flex justify-center gap-3 py-4 bg-gray-100">
        <button onClick={handlePrint} className="flex items-center gap-2 bg-[#C9A84C] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#B8962E] transition-colors">
          <Printer size={18} /> Baixar / Imprimir PDF
        </button>
        <a href={`https://wa.me/?text=${shareMsg}`} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 bg-green-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-600 transition-colors">
          <Share2 size={18} /> WhatsApp
        </a>
        <a href={`https://www.instagram.com/`} target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
          <Share2 size={18} /> Instagram
        </a>
      </div>

      {/* Certificado */}
      <div className="flex justify-center py-8 px-4 bg-gray-100 min-h-screen">
        <div className="certificate bg-white w-full max-w-3xl rounded-2xl overflow-hidden"
          style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: 'Georgia, serif' }}>

          {/* Topo dourado */}
          <div style={{ height: '8px', background: 'linear-gradient(90deg, #C9A84C, #FFD700, #C9A84C)' }} />

          <div className="p-10 text-center">
            {/* Logo */}
            <img src="/images/logo-022runners.png" alt="022 RUNNER" className="h-16 w-auto mx-auto mb-6 object-contain" />

            {/* Título */}
            <p className="text-sm font-semibold tracking-widest mb-2" style={{ color: '#C9A84C' }}>CERTIFICADO DE PARTICIPAÇÃO</p>
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)', margin: '0 auto 24px', maxWidth: '200px' }} />

            <p className="text-lg text-gray-500 mb-2">Certificamos que</p>
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#1e293b' }}>{reg.name}</h1>

            <p className="text-lg text-gray-500 mb-2">participou do evento</p>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#C9A84C' }}>{event.title}</h2>

            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mb-8">
              {[
                { label: 'Data', value: eventDate },
                { label: 'Cidade', value: `${event.city} — RJ` },
                { label: 'Percurso', value: reg.distance_name },
              ].map(item => (
                <div key={item.label} className="rounded-xl p-3" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <p className="text-xs font-semibold tracking-wide mb-1" style={{ color: '#94a3b8' }}>{item.label}</p>
                  <p className="font-bold text-gray-900 text-sm">{item.value}</p>
                </div>
              ))}
            </div>

            {/* QR + número */}
            <div className="flex items-center justify-center gap-6 mb-8">
              <QRCodeSVG value={qrValue} size={80} level="M" />
              <div className="text-left">
                <p className="text-xs text-gray-400 mb-1">Número de Inscrição</p>
                <p className="font-mono font-bold text-xl" style={{ color: '#C9A84C' }}>{reg.registration_number}</p>
                <p className="text-xs text-gray-400 mt-1">Escaneie para validar</p>
              </div>
            </div>

            {/* Assinatura */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <div style={{ borderBottom: '2px solid #1e293b', width: '200px', margin: '0 auto 8px' }} />
              <p className="font-bold text-gray-700">022 RUNNER</p>
              <p className="text-sm text-gray-400">Plataforma de Eventos Esportivos</p>
              <p className="text-sm text-gray-400">Região dos Lagos — RJ</p>
            </div>
          </div>

          {/* Rodapé dourado */}
          <div style={{ height: '8px', background: 'linear-gradient(90deg, #C9A84C, #FFD700, #C9A84C)' }} />
        </div>
      </div>
    </>
  );
}
