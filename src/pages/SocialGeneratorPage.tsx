import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Sparkles, Copy, Share2 } from 'lucide-react';

const POST_TYPES = [
  { key: 'open', label: '🚀 Abertura de Inscrições' },
  { key: 'last_slots', label: '⚡ Últimas Vagas' },
  { key: 'event_day', label: '🏁 Dia do Evento' },
  { key: 'results', label: '🏆 Resultados' },
];

const PLATFORMS = ['Instagram', 'Facebook', 'WhatsApp'];

function generatePost(event: any, type: string, platform: string): string {
  const date = new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const url = `https://022runner.com.br/evento/${event.slug}`;
  const tags = `#022Runner #RegiaoDosLagos #${event.city?.replace(/\s/g, '')} #Corrida #RunningBrasil`;

  const templates: Record<string, Record<string, string>> = {
    open: {
      Instagram: `🏃 INSCRIÇÕES ABERTAS!\n\n${event.title}\n📅 ${date}\n📍 ${event.city} - RJ\n\nGaranta já sua vaga! Link na bio ✨\n\n${tags}`,
      Facebook: `🏃 INSCRIÇÕES ABERTAS para o ${event.title}!\n\n📅 ${date}\n📍 ${event.city}, RJ\n\nInformações e inscrições: ${url}\n\n${tags}`,
      WhatsApp: `🏃 *${event.title}*\n\n✅ Inscrições abertas!\n📅 ${date}\n📍 ${event.city} - RJ\n\n👉 ${url}`,
    },
    last_slots: {
      Instagram: `⚡ ÚLTIMAS VAGAS!\n\n${event.title} está quase esgotado!\n📅 ${date} | ${event.city}\n\nNão fique de fora! Link na bio 🔥\n\n${tags}`,
      Facebook: `⚡ ÚLTIMAS VAGAS — ${event.title}!\n\nCorra para garantir a sua: ${url}\n\n${tags}`,
      WhatsApp: `⚡ *ÚLTIMAS VAGAS!*\n*${event.title}*\n📅 ${date}\n\nInscreva-se: ${url}`,
    },
    event_day: {
      Instagram: `🏁 É HOJE!\n\n${event.title}\n📍 ${event.location} — ${event.city}\n\nBoa corrida para todos! 💪\n\n${tags}`,
      Facebook: `🏁 HOJE É DIA DE CORRER!\n\n${event.title} acontece hoje em ${event.city}. Boa sorte a todos os atletas!\n\n${tags}`,
      WhatsApp: `🏁 *É HOJE!* ${event.title}\n📍 ${event.location}\n\nBoa corrida! 💪🏃`,
    },
    results: {
      Instagram: `🏆 RESULTADOS — ${event.title}\n\nParabéns a todos que participaram!\n📅 ${date} | ${event.city}\n\nConfira os resultados completos no link da bio 🎉\n\n${tags}`,
      Facebook: `🏆 Resultados do ${event.title} já disponíveis! Parabéns a todos os atletas que participaram! ${url}\n\n${tags}`,
      WhatsApp: `🏆 *Resultados — ${event.title}*\n\nParabéns a todos! Confira: ${url}`,
    },
  };

  return templates[type]?.[platform] || '';
}

export function SocialGeneratorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [postType, setPostType] = useState('open');
  const [platform, setPlatform] = useState('Instagram');
  const [generatedText, setGeneratedText] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('events').select('*').eq('organizer_id', user.id).eq('status', 'published')
      .then(({ data }) => { setEvents(data || []); if (data?.[0]) setSelectedEvent(data[0]); });
  }, [user]);

  useEffect(() => {
    if (selectedEvent) setGeneratedText(generatePost(selectedEvent, postType, platform));
  }, [selectedEvent, postType, platform]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success('Texto copiado!');
  };

  const handleShare = () => {
    if (platform === 'WhatsApp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(generatedText)}`, '_blank');
    } else if (platform === 'Facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(generatedText)}`, '_blank');
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={28} style={{ color: '#C9A84C' }} /> Gerador de Posts
          </h1>
          <p className="text-gray-500 mt-1">Crie posts prontos para suas redes sociais</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Configurações */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Configurações</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Evento</label>
              <select value={selectedEvent?.id || ''} onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Tipo de Post</label>
              <select value={postType} onChange={e => setPostType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {POST_TYPES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Plataforma</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none">
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Post Gerado</h2>
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                <Copy size={14} /> Copiar
              </button>
              <button onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ backgroundColor: '#C9A84C', color: '#000' }}>
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
          </div>
          <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)}
            rows={10} className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
            style={{ borderColor: '#e5e7eb', fontFamily: 'monospace' }} />
          <p className="text-xs text-gray-400 mt-2">{generatedText.length} caracteres · Edite o texto acima se quiser personalizar</p>
        </div>
      </div>
    </div>
  );
}
