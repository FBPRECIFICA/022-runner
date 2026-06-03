import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Sparkles, Copy, Share2, RefreshCw, Clock } from 'lucide-react';

const AI_FUNCTION_URL = 'https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/ai-assistant';

const POST_TYPES = [
  { key: 'abertura_inscricoes', label: '🚀 Abertura de Inscrições' },
  { key: 'ultimas_vagas', label: '⚡ Últimas Vagas' },
  { key: 'dia_evento', label: '🏁 Dia do Evento' },
  { key: 'resultados', label: '🏆 Resultados' },
];
const PLATFORMS = ['Instagram', 'WhatsApp', 'Facebook'];
const HISTORY_KEY = 'social_post_history';

async function callAIAssistant(type: string, eventData: any, platform: string): Promise<string> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'post', eventData: { ...eventData, postType: type }, platform }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

export function SocialGeneratorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [postType, setPostType] = useState('abertura_inscricoes');
  const [platform, setPlatform] = useState('Instagram');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ text: string; event: string; type: string; platform: string; ts: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('events').select('*').eq('organizer_id', user.id).eq('status', 'published')
      .then(({ data }) => { setEvents(data || []); if (data?.[0]) setSelectedEvent(data[0]); });
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) setHistory(JSON.parse(saved));
  }, [user]);

  const generate = async () => {
    if (!selectedEvent) { toast.error('Selecione um evento.'); return; }
    setLoading(true);
    try {
      const distances = (selectedEvent.distances || []).map((d: any) => d.name).join(', ');
      const date = new Date(selectedEvent.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      const text = await callAIAssistant(postType, {
        title: selectedEvent.title,
        city: selectedEvent.city,
        date,
        distances,
        slug: selectedEvent.slug,
      }, platform);
      setGeneratedText(text);
      const entry = { text, event: selectedEvent.title, type: postType, platform, ts: Date.now() };
      const newHistory = [entry, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      toast.success('Post gerado com IA!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar post.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success('Copiado!');
  };

  const handleShare = () => {
    if (platform === 'WhatsApp') window.open(`https://wa.me/?text=${encodeURIComponent(generatedText)}`, '_blank');
    else if (platform === 'Facebook') window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(generatedText)}`, '_blank');
    else { handleCopy(); toast.success('Texto copiado — cole no Instagram!'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={28} style={{ color: '#C9A84C' }} /> Gerador de Posts com IA
          </h1>
          <p className="text-gray-500 mt-1">Posts criados pela IA Claude especialmente para seus eventos</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Configurações */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Configurações</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ backgroundColor: '#C9A84C', color: '#000' }}>
            {loading ? <><RefreshCw size={16} className="animate-spin" /> Gerando com IA...</> : <><Sparkles size={16} /> Gerar com IA</>}
          </button>
        </div>

        {/* Resultado */}
        {generatedText && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Post Gerado</h2>
              <div className="flex gap-2">
                <button onClick={generate} disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                  <RefreshCw size={12} /> Regenerar
                </button>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                  <Copy size={12} /> Copiar
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: '#C9A84C', color: '#000' }}>
                  <Share2 size={12} /> Compartilhar
                </button>
              </div>
            </div>
            <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)}
              rows={12} className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none font-mono"
              style={{ borderColor: '#e5e7eb' }} />
            <p className="text-xs text-gray-400 mt-2">{generatedText.length} caracteres · Edite o texto acima se quiser personalizar</p>
          </div>
        )}

        {/* Histórico */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Clock size={16} /> Últimos Posts Gerados</h2>
            <div className="space-y-2">
              {history.map((h, i) => (
                <button key={i} onClick={() => setGeneratedText(h.text)}
                  className="w-full text-left p-3 border rounded-lg hover:border-yellow-400 hover:bg-amber-50/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{h.event}</span>
                    <span className="text-xs text-gray-400">{new Date(h.ts).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{h.text}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f0e6c8', color: '#92400e' }}>{h.platform}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
