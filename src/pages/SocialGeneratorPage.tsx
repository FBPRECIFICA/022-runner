import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Sparkles, Copy, Share2, RefreshCw, Clock, Download, Image } from 'lucide-react';
import { RunnerPostsIcon } from '../components/RunnerPostsIcon';

const AI_FUNCTION_URL = 'https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/ai-assistant';
const ANON_KEY = 'sb_publishable_b098wEy_wai6_RWuR5pV7g_IAw-x86p';

const POST_TYPES = [
  { key: 'abertura_inscricoes', label: '🚀 Abertura de Inscrições' },
  { key: 'ultimas_vagas', label: '⚡ Últimas Vagas' },
  { key: 'dia_evento', label: '🏁 Dia do Evento' },
  { key: 'resultados', label: '🏆 Resultados' },
];
const PLATFORMS = ['Instagram', 'WhatsApp', 'Facebook'];
const HISTORY_KEY = 'social_post_history';
const GOLD = '#C9A84C';

async function callAIAssistant(type: string, eventData: any, platform: string): Promise<string> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ type: 'post', eventData: { ...eventData, postType: type }, platform }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text;
}

function drawGradientBg(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#050505');
  grad.addColorStop(0.6, '#111111');
  grad.addColorStop(1, '#1a0d00');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): number {
  const words = text.split(' ');
  let line = '';
  let y = startY;
  let linesDrawn = 0;
  for (const word of words) {
    if (linesDrawn >= maxLines) break;
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, y);
      line = word + ' ';
      y += lineHeight;
      linesDrawn++;
    } else {
      line = test;
    }
  }
  if (line.trim() && linesDrawn < maxLines) {
    ctx.fillText(line.trim(), x, y);
    y += lineHeight;
  }
  return y;
}

export function SocialGeneratorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [postType, setPostType] = useState('abertura_inscricoes');
  const [platform, setPlatform] = useState('Instagram');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [history, setHistory] = useState<{ text: string; event: string; type: string; platform: string; ts: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('events').select('*').eq('organizer_id', user.id).eq('status', 'published')
      .then(({ data }) => { setEvents(data || []); if (data?.[0]) setSelectedEvent(data[0]); });
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) setHistory(JSON.parse(saved));
  }, [user]);

  const generatePostImage = useCallback(async (_text: string, event: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setGeneratingImage(true);
    const W = 1080, H = 1080;
    canvas.width = W;
    canvas.height = H;

    // 1 — Background: foto do evento cobrindo 100% ou gradiente fallback
    let bgLoaded = false;
    if (event.banner_url) {
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('cors'));
          img.src = event.banner_url;
        });
        const scale = Math.max(W / img.width, H / img.height);
        const sw = img.width * scale, sh = img.height * scale;
        ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
        bgLoaded = true;
      } catch {
        bgLoaded = false;
      }
    }
    if (!bgLoaded) drawGradientBg(ctx, W, H);

    // 2 — Overlay base: transparente no topo, preto 80% na metade inferior
    const baseOverlay = ctx.createLinearGradient(0, 0, 0, H);
    baseOverlay.addColorStop(0,    'rgba(0,0,0,0.05)');
    baseOverlay.addColorStop(0.35, 'rgba(0,0,0,0.05)');
    baseOverlay.addColorStop(0.65, 'rgba(0,0,0,0.55)');
    baseOverlay.addColorStop(1,    'rgba(0,0,0,0.88)');
    ctx.fillStyle = baseOverlay;
    ctx.fillRect(0, 0, W, H);

    // 3 — Variação aleatória do overlay (direção e intensidade)
    const intensity = 0.5 + Math.random() * 0.3;
    const varType = Math.floor(Math.random() * 3);
    if (varType === 0) {
      // Gradiente lateral (esquerda)
      const g = ctx.createLinearGradient(0, 0, W * 0.65, 0);
      g.addColorStop(0, `rgba(0,0,0,${intensity})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else if (varType === 1) {
      // Diagonal
      const g = ctx.createLinearGradient(0, H, W, 0);
      g.addColorStop(0,   `rgba(0,0,0,${intensity})`);
      g.addColorStop(0.5, 'rgba(0,0,0,0)');
      g.addColorStop(1,   `rgba(0,0,0,${intensity * 0.5})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    } else {
      // Topo escuro
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.55);
      g.addColorStop(0, `rgba(0,0,0,${intensity * 0.8})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // 4 — Elemento decorativo aleatório em dourado
    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.65;
    const decType = Math.floor(Math.random() * 3);
    if (decType === 0) {
      // Linha diagonal no canto superior direito
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(W - 260, 0);
      ctx.lineTo(W, 260);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W - 200, 0);
      ctx.lineTo(W, 200);
      ctx.stroke();
    } else if (decType === 1) {
      // Círculo no canto superior direito
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W - 90, 90, 70, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W - 90, 90, 50, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Moldura fina interna
      ctx.lineWidth = 3;
      ctx.strokeRect(24, 24, W - 48, H - 48);
    }
    ctx.restore();

    ctx.textBaseline = 'alphabetic';

    // 5 — Logo "022 RUNNER" topo esquerdo, branco
    ctx.textAlign = 'left';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    ctx.fillText('022 RUNNER', 60, 82);
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // Linha dourada fina sob o logo
    ctx.fillStyle = GOLD;
    ctx.fillRect(60, 92, 170, 3);

    // 6 — Nome do evento: centro inferior, branco bold grande, máx 2 linhas
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 4;
    wrapText(ctx, event.title.toUpperCase(), W / 2, H - 280, W - 120, 86, 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowColor = 'transparent';

    // 7 — Data e cidade em dourado
    const date = new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    ctx.font = '36px Arial, sans-serif';
    ctx.fillStyle = GOLD;
    ctx.fillText(`${date}  ·  ${event.city}`, W / 2, H - 170);

    // 8 — Barra dourada 4px na parte inferior
    ctx.fillStyle = GOLD;
    ctx.fillRect(0, H - 4, W, 4);

    // 9 — URL no canto inferior direito
    ctx.textAlign = 'right';
    ctx.font = '26px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('022runner.com.br', W - 40, H - 16);

    setImageDataUrl(canvas.toDataURL('image/png'));
    setGeneratingImage(false);
  }, []);

  const generate = async () => {
    if (!selectedEvent) { toast.error('Selecione um evento.'); return; }
    setLoading(true);
    setImageDataUrl('');
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
      // Gerar imagem automaticamente
      await generatePostImage(text, selectedEvent);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar post.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success('Texto copiado!');
  };

  const handleDownloadImage = () => {
    if (!imageDataUrl) return;
    const link = document.createElement('a');
    link.download = `post-${selectedEvent?.slug || 'evento'}-1080x1080.png`;
    link.href = imageDataUrl;
    link.click();
    toast.success('Imagem baixada!');
  };

  const handleShare = () => {
    if (platform === 'WhatsApp') window.open(`https://wa.me/?text=${encodeURIComponent(generatedText)}`, '_blank');
    else if (platform === 'Facebook') window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(generatedText)}`, '_blank');
    else { handleCopy(); toast.success('Texto copiado — cole no Instagram!'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Canvas oculto — usado apenas para geração */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="bg-white border-b py-8">
        <div className="max-w-5xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <RunnerPostsIcon /> Gerador de Posts com IA
          </h1>
          <p className="text-gray-500 mt-1">Posts e imagens criados pela IA especialmente para seus eventos</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
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
          <button onClick={generate} disabled={loading || generatingImage}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-60"
            style={{ backgroundColor: GOLD, color: '#000' }}>
            {loading
              ? <><RefreshCw size={16} className="animate-spin" /> Gerando com IA...</>
              : generatingImage
                ? <><Image size={16} className="animate-pulse" /> Gerando imagem...</>
                : <><Sparkles size={16} /> Gerar post + imagem</>}
          </button>
        </div>

        {/* Resultado — texto + imagem lado a lado */}
        {generatedText && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Post Gerado</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={generate} disabled={loading || generatingImage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: GOLD, color: GOLD }}>
                  <RefreshCw size={12} /> Regenerar
                </button>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{ borderColor: GOLD, color: GOLD }}>
                  <Copy size={12} /> Copiar texto
                </button>
                <button onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: GOLD, color: '#000' }}>
                  <Share2 size={12} /> Compartilhar
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Coluna esquerda — texto */}
              <div>
                <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)}
                  rows={14} className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none font-mono"
                  style={{ borderColor: '#e5e7eb' }} />
                <p className="text-xs text-gray-400 mt-1">{generatedText.length} caracteres · Edite acima se quiser personalizar</p>
              </div>

              {/* Coluna direita — preview da imagem */}
              <div className="flex flex-col items-center gap-3">
                {generatingImage ? (
                  <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Image size={32} className="animate-pulse" style={{ color: GOLD }} />
                    <p className="text-sm">Gerando imagem 1080×1080…</p>
                  </div>
                ) : imageDataUrl ? (
                  <>
                    <div className="w-full rounded-xl overflow-hidden shadow-lg border" style={{ aspectRatio: '1/1' }}>
                      <img src={imageDataUrl} alt="Post gerado" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2 w-full">
                      <button onClick={handleDownloadImage}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
                        style={{ backgroundColor: GOLD, color: '#000' }}>
                        <Download size={15} /> Baixar imagem
                      </button>
                      <button onClick={() => generatePostImage(generatedText, selectedEvent)}
                        className="px-4 py-2.5 rounded-xl border text-sm font-medium"
                        style={{ borderColor: GOLD, color: GOLD }}>
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">PNG 1080×1080px — pronto para Instagram</p>
                  </>
                ) : (
                  <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Image size={32} />
                    <p className="text-sm text-center px-4">A imagem aparecerá aqui após gerar o post</p>
                  </div>
                )}
              </div>
            </div>
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
