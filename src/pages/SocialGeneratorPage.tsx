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

const FORMATS = [
  { key: 'feed', label: 'Feed Instagram', w: 1080, h: 1080 },
  { key: 'stories', label: 'Stories', w: 1080, h: 1920 },
  { key: 'whatsapp', label: 'WhatsApp', w: 800, h: 800 },
];

const TEMPLATES = [
  { key: 'A', label: 'Template A', desc: 'Centralizado · faixa dourada' },
  { key: 'B', label: 'Template B', desc: 'À esquerda · bloco lateral' },
  { key: 'C', label: 'Template C', desc: 'Topo + ícone do esporte' },
];

type Palette = { from: string; to: string; accent: string };

function getAccentByType(sportType: string): Palette {
  const t = (sportType || '').toLowerCase();
  if (t.includes('corrida') || t.includes('run')) return { from: '#000000', to: '#1a0a00', accent: '#C9A84C' };
  if (t.includes('trilha') || t.includes('trail')) return { from: '#000000', to: '#0a1500', accent: '#2d6a1a' };
  if (t.includes('cicli') || t.includes('bike')) return { from: '#000000', to: '#00101a', accent: '#0a4a7a' };
  if (t.includes('tri')) return { from: '#000000', to: '#1a001a', accent: '#5a0a7a' };
  return { from: '#000000', to: '#1a1500', accent: '#C9A84C' };
}

async function callAIAssistant(type: string, eventData: Record<string, unknown>, platform: string): Promise<string> {
  const res = await fetch(AI_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ type: 'post', eventData: { ...eventData, postType: type }, platform }),
  });
  const data = await res.json() as { error?: string; text?: string };
  if (data.error) throw new Error(data.error);
  return data.text ?? '';
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

function drawBase(ctx: CanvasRenderingContext2D, W: number, H: number, palette: Palette) {
  // Gradiente diagonal baseado no tipo do evento
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, palette.from);
  grad.addColorStop(1, palette.to);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Linhas diagonais decorativas finas (acento, 0.15 opacidade)
  ctx.save();
  ctx.strokeStyle = palette.accent;
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 1.5;
  const step = Math.round(W / 13);
  for (let i = -H; i < W + H; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // Retângulo lateral esquerdo 6px
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, 6, H);

  // Círculo decorativo canto superior direito (0.05 opacidade)
  ctx.save();
  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.05;
  ctx.beginPath();
  ctx.arc(W - 80, 80, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLogoAndFooter(ctx: CanvasRenderingContext2D, W: number, H: number, fs: number) {
  ctx.textBaseline = 'alphabetic';

  // Logo "022 RUNNER" topo centro
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(48 * fs)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 12;
  ctx.fillText('022 RUNNER', W / 2, Math.round(75 * fs));
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Linha dourada horizontal no rodapé (y=980 relativo a 1080)
  const footerLineY = H - Math.round((H / 1080) * 100);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, footerLineY, W, 4);

  // URL rodapé
  ctx.textAlign = 'right';
  ctx.font = `${Math.round(24 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = '#666666';
  ctx.fillText('022runner.com.br', W - Math.round(40 * fs), H - Math.round(14 * fs));
}

function drawTemplateA(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  event: Record<string, unknown>,
  palette: Palette,
  dateStr: string,
  fs: number,
) {
  drawBase(ctx, W, H, palette);
  drawLogoAndFooter(ctx, W, H, fs);

  ctx.textBaseline = 'alphabetic';
  const cx = W / 2;

  // Nome do evento — centralizado, grande
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(72 * fs)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  const nameY = H * 0.48;
  const endY = wrapText(ctx, String(event.title ?? '').toUpperCase(), cx, nameY, W - Math.round(120 * fs), Math.round(86 * fs), 2);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'transparent';

  // Faixa dourada abaixo do título
  ctx.fillStyle = GOLD;
  ctx.fillRect(W * 0.2, endY + Math.round(8 * fs), W * 0.6, Math.round(4 * fs));

  // Data
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(36 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(dateStr, cx, endY + Math.round(58 * fs));

  // Local com ícone
  ctx.font = `${Math.round(32 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`📍 ${String(event.city ?? '')}`, cx, endY + Math.round(104 * fs));

  // Distância / modalidade
  const modality = String(event.distance ?? event.category ?? event.sport_type ?? '');
  if (modality) {
    ctx.font = `${Math.round(28 * fs)}px Arial, sans-serif`;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(modality, cx, endY + Math.round(148 * fs));
  }

  // Preço
  if (event.price) {
    ctx.font = `bold ${Math.round(40 * fs)}px Arial, sans-serif`;
    ctx.fillStyle = GOLD;
    ctx.fillText(`A partir de R$ ${event.price}`, cx, endY + Math.round(205 * fs));
  }
}

function drawTemplateB(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  event: Record<string, unknown>,
  palette: Palette,
  dateStr: string,
  fs: number,
) {
  drawBase(ctx, W, H, palette);
  drawLogoAndFooter(ctx, W, H, fs);

  ctx.textBaseline = 'alphabetic';
  const lx = Math.round(60 * fs);

  // Bloco lateral dourado espessado
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, H * 0.33, Math.round(12 * fs), H * 0.52);

  // Nome do evento — alinhado à esquerda
  ctx.textAlign = 'left';
  ctx.font = `bold ${Math.round(72 * fs)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  const nameY = H * 0.47;
  const endY = wrapText(ctx, String(event.title ?? '').toUpperCase(), lx, nameY, W - Math.round(120 * fs), Math.round(86 * fs), 2);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'transparent';

  // Data
  ctx.textAlign = 'left';
  ctx.font = `${Math.round(36 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(dateStr, lx, endY + Math.round(54 * fs));

  // Local
  ctx.font = `${Math.round(32 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`📍 ${String(event.city ?? '')}`, lx, endY + Math.round(98 * fs));

  // Distância / modalidade
  const modality = String(event.distance ?? event.category ?? event.sport_type ?? '');
  if (modality) {
    ctx.font = `${Math.round(28 * fs)}px Arial, sans-serif`;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(modality, lx, endY + Math.round(140 * fs));
  }

  // Preço
  if (event.price) {
    ctx.font = `bold ${Math.round(40 * fs)}px Arial, sans-serif`;
    ctx.fillStyle = GOLD;
    ctx.fillText(`A partir de R$ ${event.price}`, lx, endY + Math.round(196 * fs));
  }
}

function drawTemplateC(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  event: Record<string, unknown>,
  palette: Palette,
  dateStr: string,
  fs: number,
) {
  drawBase(ctx, W, H, palette);
  drawLogoAndFooter(ctx, W, H, fs);

  ctx.textBaseline = 'alphabetic';
  const cx = W / 2;

  // Nome do evento — topo
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(64 * fs)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 4;
  wrapText(ctx, String(event.title ?? '').toUpperCase(), cx, H * 0.2, W - Math.round(120 * fs), Math.round(78 * fs), 2);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'transparent';

  // Ícone do esporte — centro
  const st = String(event.sport_type ?? '').toLowerCase();
  let icon = '🏃';
  if (st.includes('bike') || st.includes('cicl')) icon = '🚴';
  else if (st.includes('tri')) icon = '🏊';
  else if (st.includes('trail') || st.includes('trilha')) icon = '🥾';
  ctx.font = `${Math.round(130 * fs)}px serif`;
  ctx.fillText(icon, cx, H * 0.55);

  // Dados abaixo do ícone
  let by = H * 0.66;

  ctx.font = `${Math.round(36 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(dateStr, cx, by);
  by += Math.round(50 * fs);

  ctx.font = `${Math.round(32 * fs)}px Arial, sans-serif`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`📍 ${String(event.city ?? '')}`, cx, by);
  by += Math.round(46 * fs);

  const modality = String(event.distance ?? event.category ?? event.sport_type ?? '');
  if (modality) {
    ctx.font = `${Math.round(28 * fs)}px Arial, sans-serif`;
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(modality, cx, by);
    by += Math.round(42 * fs);
  }

  if (event.price) {
    ctx.font = `bold ${Math.round(40 * fs)}px Arial, sans-serif`;
    ctx.fillStyle = GOLD;
    ctx.fillText(`A partir de R$ ${event.price}`, cx, by);
  }
}

export function SocialGeneratorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Record<string, unknown> | null>(null);
  const [postType, setPostType] = useState('abertura_inscricoes');
  const [platform, setPlatform] = useState('Instagram');
  const [format, setFormat] = useState('feed');
  const [template, setTemplate] = useState('A');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [history, setHistory] = useState<{ text: string; event: string; type: string; platform: string; ts: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('events').select('*').eq('organizer_id', user.id).eq('status', 'published')
      .then(({ data }) => {
        const rows = (data ?? []) as Record<string, unknown>[];
        setEvents(rows);
        if (rows[0]) setSelectedEvent(rows[0]);
      });
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) setHistory(JSON.parse(saved) as typeof history);
  }, [user]);

  const generateCanvas = useCallback(async (event: Record<string, unknown>, fmt: string, tpl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setGeneratingImage(true);
    const fmtDef = FORMATS.find(f => f.key === fmt) ?? FORMATS[0];
    const W = fmtDef.w;
    const H = fmtDef.h;
    canvas.width = W;
    canvas.height = H;

    const palette = getAccentByType(String(event.sport_type ?? ''));
    const fs = W / 1080; // font scale
    const dateStr = event.date
      ? new Date(String(event.date)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : '';

    if (tpl === 'A') drawTemplateA(ctx, W, H, event, palette, dateStr, fs);
    else if (tpl === 'B') drawTemplateB(ctx, W, H, event, palette, dateStr, fs);
    else drawTemplateC(ctx, W, H, event, palette, dateStr, fs);

    setImageDataUrl(canvas.toDataURL('image/png'));
    setGeneratingImage(false);
  }, []);

  const generate = async () => {
    if (!selectedEvent) { toast.error('Selecione um evento.'); return; }
    setLoading(true);
    setImageDataUrl('');
    try {
      const distances = (Array.isArray(selectedEvent.distances) ? selectedEvent.distances : [])
        .map((d: Record<string, unknown>) => String(d.name ?? '')).join(', ');
      const date = selectedEvent.date
        ? new Date(String(selectedEvent.date)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '';
      const text = await callAIAssistant(postType, {
        title: selectedEvent.title,
        city: selectedEvent.city,
        date,
        distances,
        slug: selectedEvent.slug,
      }, platform);
      setGeneratedText(text);
      const entry = { text, event: String(selectedEvent.title ?? ''), type: postType, platform, ts: Date.now() };
      const newHistory = [entry, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      toast.success('Post gerado com IA!');
      await generateCanvas(selectedEvent, format, template);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar post.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!selectedEvent) return;
    await generateCanvas(selectedEvent, format, template);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedText);
    toast.success('Texto copiado!');
  };

  const handleDownloadImage = () => {
    if (!imageDataUrl) return;
    const fmtDef = FORMATS.find(f => f.key === format) ?? FORMATS[0];
    const link = document.createElement('a');
    link.download = `post-${String(selectedEvent?.slug ?? 'evento')}-${fmtDef.w}x${fmtDef.h}.png`;
    link.href = imageDataUrl;
    link.click();
    toast.success('Imagem baixada!');
  };

  const handleShare = () => {
    if (platform === 'WhatsApp') window.open(`https://wa.me/?text=${encodeURIComponent(generatedText)}`, '_blank');
    else if (platform === 'Facebook') window.open(`https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(generatedText)}`, '_blank');
    else { handleCopy(); toast.success('Texto copiado — cole no Instagram!'); }
  };

  const handleFormatChange = (fmt: string) => {
    setFormat(fmt);
    if (selectedEvent && imageDataUrl) generateCanvas(selectedEvent, fmt, template);
  };

  const handleTemplateChange = (tpl: string) => {
    setTemplate(tpl);
    if (selectedEvent && imageDataUrl) generateCanvas(selectedEvent, format, tpl);
  };

  const currentFmt = FORMATS.find(f => f.key === format) ?? FORMATS[0];

  return (
    <div className="min-h-screen bg-gray-50">
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
              <select
                value={String(selectedEvent?.id ?? '')}
                onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value) ?? null)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
              >
                {events.map(ev => <option key={String(ev.id)} value={String(ev.id)}>{String(ev.title)}</option>)}
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

        {/* Seletor de Formato e Template */}
        {(generatedText || imageDataUrl) && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <div className="grid sm:grid-cols-2 gap-5">
              {/* Formato */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Formato da Imagem</h3>
                <div className="flex gap-2 flex-wrap">
                  {FORMATS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => handleFormatChange(f.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={format === f.key
                        ? { backgroundColor: GOLD, color: '#000', borderColor: GOLD }
                        : { borderColor: '#d1d5db', color: '#6b7280' }}>
                      {f.label}
                      <span className="ml-1 opacity-60">{f.w}×{f.h}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Template */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Layout</h3>
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.key}
                      onClick={() => handleTemplateChange(t.key)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                      style={template === t.key
                        ? { backgroundColor: GOLD, color: '#000', borderColor: GOLD }
                        : { borderColor: '#d1d5db', color: '#6b7280' }}>
                      {t.label}
                      <span className="block text-[10px] opacity-60">{t.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultado — texto + imagem */}
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
              {/* Texto */}
              <div>
                <textarea value={generatedText} onChange={e => setGeneratedText(e.target.value)}
                  rows={14} className="w-full border rounded-xl px-4 py-3 text-sm focus:outline-none resize-none font-mono"
                  style={{ borderColor: '#e5e7eb' }} />
                <p className="text-xs text-gray-400 mt-1">{generatedText.length} caracteres · Edite acima se quiser personalizar</p>
              </div>

              {/* Preview da imagem */}
              <div className="flex flex-col items-center gap-3">
                {generatingImage ? (
                  <div className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Image size={32} className="animate-pulse" style={{ color: GOLD }} />
                    <p className="text-sm">Gerando {currentFmt.w}×{currentFmt.h}…</p>
                  </div>
                ) : imageDataUrl ? (
                  <>
                    <div
                      className="w-full rounded-xl overflow-hidden shadow-lg border"
                      style={{ aspectRatio: `${currentFmt.w}/${currentFmt.h}` }}
                    >
                      <img src={imageDataUrl} alt="Post gerado" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2 w-full">
                      <button onClick={handleDownloadImage}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
                        style={{ backgroundColor: GOLD, color: '#000' }}>
                        <Download size={15} /> Baixar imagem
                      </button>
                      <button onClick={handleRegenerateImage} disabled={generatingImage}
                        className="px-4 py-2.5 rounded-xl border text-sm font-medium"
                        style={{ borderColor: GOLD, color: GOLD }}>
                        <RefreshCw size={14} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">PNG {currentFmt.w}×{currentFmt.h}px</p>
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
