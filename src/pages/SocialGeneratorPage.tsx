import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Download, X } from 'lucide-react';
import { LOGO_022RUNNERS } from '../assets/logo022runners';

const GOLD = '#C9A84C';

const FORMATS = [
  { key: 'feed', label: 'Feed Instagram', w: 1080, h: 1080 },
  { key: 'stories', label: 'Stories Instagram', w: 1080, h: 1920 },
  { key: 'whatsapp', label: 'WhatsApp', w: 800, h: 800 },
];

type PostType = 'divulgacao' | 'resultado';
type FormatKey = 'feed' | 'stories' | 'whatsapp';

interface EventRow {
  id: string;
  title: string;
  date?: string;
  city?: string;
  state?: string;
  distance?: string;
  category?: string;
  sport_type?: string;
  price?: number | string;
  slug?: string;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function eventName(ev: EventRow): string {
  return String(ev.title ?? '').toUpperCase();
}

function eventDistance(ev: EventRow): string {
  return String(ev.distance ?? ev.category ?? ev.sport_type ?? '');
}

function eventLocation(ev: EventRow): string {
  const parts = [ev.city, ev.state].filter(Boolean);
  return parts.join(' - ');
}

function eventPrice(ev: EventRow): string {
  if (!ev.price) return '';
  return `R$ ${Number(ev.price).toFixed(2).replace('.', ',')}`;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function dynamicFontSize(text: string): number {
  if (text.length <= 20) return 72;
  if (text.length <= 35) return 56;
  return 44;
}

// ── canvas drawing ────────────────────────────────────────────────────────────

function drawOverlay(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Bottom-to-top gradient overlay
  const grad = ctx.createLinearGradient(0, H, 0, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // Left side overlay
  const left = ctx.createLinearGradient(0, 0, W * 0.5, 0);
  left.addColorStop(0, 'rgba(0,0,0,0.3)');
  left.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, W, H);
}

function drawPremiumBg(ctx: CanvasRenderingContext2D, W: number, H: number) {
  // Radial gradient background
  const radial = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
  radial.addColorStop(0, '#1a0800');
  radial.addColorStop(1, '#000000');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, W, H);

  // Diagonal texture lines
  ctx.save();
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.04;
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 12) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // Decorative circle top-right
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.04;
  ctx.beginPath();
  ctx.arc(W, 0, 300, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Decorative circle bottom-left
  ctx.save();
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.06;
  ctx.beginPath();
  ctx.arc(0, H, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Left accent bar
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, 8, H);
}

function drawBrushstroke(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number) {
  const bx = W * 0.05;
  const bw = W * 0.90;
  const by = Math.round(380 * scale);
  const bh = Math.round(140 * scale);
  ctx.save();
  ctx.translate(W / 2, by + bh / 2);
  ctx.rotate((-1.5 * Math.PI) / 180);
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  // irregular brushstroke shape
  ctx.moveTo(-bw / 2 + 10, -bh / 2 + 5);
  ctx.lineTo(bw / 2 - 8, -bh / 2);
  ctx.lineTo(bw / 2 - bx / 2, bh / 2 - 3);
  ctx.lineTo(-bw / 2 + 5, bh / 2 + 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHorizontalLine(ctx: CanvasRenderingContext2D, W: number, y: number) {
  ctx.fillStyle = GOLD;
  ctx.fillRect(W * 0.1, y, W * 0.8, 2);
}

async function drawLogo(ctx: CanvasRenderingContext2D, W: number, y: number): Promise<void> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const logoW = Math.round(320 * (W / 1080));
      const logoH = Math.round((img.height / img.width) * logoW);
      ctx.drawImage(img, (W - logoW) / 2, y, logoW, logoH);
      resolve();
    };
    img.onerror = () => {
      // fallback text
      ctx.textAlign = 'center';
      ctx.font = `bold ${Math.round(42 * (W / 1080))}px Arial Black, Arial, sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeText('022RUNNERS', W / 2, y + 40);
      ctx.fillText('022RUNNERS', W / 2, y + 40);
      resolve();
    };
    img.src = LOGO_022RUNNERS;
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, W: number, H: number, scale: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, Math.round(960 * scale), W, Math.round(120 * scale));

  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(28 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText('022runners.com.br', W / 2, Math.round(1012 * scale));

  ctx.font = `${Math.round(20 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#888888';
  ctx.fillText('RUNNING COMMUNITY', W / 2, Math.round(1048 * scale));
}

async function renderDivulgacao(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  ev: EventRow,
  bgImage: HTMLImageElement | null,
) {
  const scale = W / 1080;

  // Background
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, W, H);
    drawOverlay(ctx, W, H);
  } else {
    drawPremiumBg(ctx, W, H);
  }

  // Logo
  await drawLogo(ctx, W, Math.round(40 * scale));

  // Top horizontal line
  drawHorizontalLine(ctx, W, Math.round(120 * scale));

  // Brushstroke
  drawBrushstroke(ctx, W, H, scale);

  // Event name over brushstroke
  const name = eventName(ev);
  const fontSize = Math.round(dynamicFontSize(name) * scale);
  ctx.font = `bold ${fontSize}px Arial Black, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;

  const lines = wrapLines(ctx, name, W * 0.88);
  const lineH = fontSize * 1.2;
  const blockH = lines.length * lineH;
  const brushCenterY = Math.round((380 + 70) * scale); // center of brushstroke
  let textY = brushCenterY - blockH / 2 + fontSize * 0.8;
  for (const line of lines) {
    ctx.fillText(line, W / 2, textY);
    textY += lineH;
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.shadowColor = 'transparent';

  // Distance / modality
  ctx.font = `bold ${Math.round(48 * scale)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(eventDistance(ev), W / 2, Math.round(560 * scale));

  // Date
  ctx.font = `${Math.round(36 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`📅 ${fmtDate(ev.date)}`, W / 2, Math.round(630 * scale));

  // Location
  ctx.font = `${Math.round(34 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`📍 ${eventLocation(ev)}`, W / 2, Math.round(680 * scale));

  // Bottom horizontal line
  drawHorizontalLine(ctx, W, Math.round(740 * scale));

  // Price / open inscriptions
  ctx.font = `bold ${Math.round(32 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  const priceText = ev.price
    ? `INSCRIÇÕES ABERTAS • ${eventPrice(ev)}`
    : 'INSCRIÇÕES ABERTAS';
  ctx.fillText(priceText, W / 2, Math.round(790 * scale));

  // Footer
  drawFooter(ctx, W, H, scale);
}

async function renderResultado(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  ev: EventRow,
  bgImage: HTMLImageElement | null,
) {
  const scale = W / 1080;

  // Background (darker overlay)
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, W, H);
    const grad = ctx.createLinearGradient(0, H, 0, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    drawPremiumBg(ctx, W, H);
  }

  // Runner icons top corners
  ctx.font = `${Math.round(48 * scale)}px serif`;
  ctx.textAlign = 'left';
  ctx.fillText('🏃', Math.round(30 * scale), Math.round(80 * scale));
  ctx.textAlign = 'right';
  ctx.fillText('🏃', W - Math.round(30 * scale), Math.round(80 * scale));

  // Logo
  await drawLogo(ctx, W, Math.round(40 * scale));

  // Gold top faixa
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, 0, W, Math.round(180 * scale));
  ctx.globalAlpha = 1;

  // RESULTADOS title
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.round(96 * scale)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 12;
  ctx.fillText('RESULTADOS', W / 2, Math.round(100 * scale));
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Event name
  ctx.font = `bold ${Math.round(56 * scale)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  const nameLines = wrapLines(ctx, eventName(ev), W * 0.88);
  let ny = Math.round(200 * scale);
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, ny);
    ny += Math.round(66 * scale);
  }

  // Motivational text
  ctx.font = `${Math.round(32 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('QUE ENERGIA FOI ESSA, GALERA!', W / 2, Math.round(300 * scale));

  // Horizontal line
  drawHorizontalLine(ctx, W, Math.round(360 * scale));

  // Distance big
  ctx.font = `bold ${Math.round(80 * scale)}px Arial Black, Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText(eventDistance(ev) || '5KM', W / 2, Math.round(450 * scale));

  // UM DIA INESQUECÍVEL
  ctx.font = `bold ${Math.round(36 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('UM DIA INESQUECÍVEL', W / 2, Math.round(520 * scale));

  // Date
  ctx.font = `${Math.round(32 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`📅 ${fmtDate(ev.date)}`, W / 2, Math.round(590 * scale));

  // Location
  ctx.font = `${Math.round(30 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#CCCCCC';
  ctx.fillText(`📍 ${eventLocation(ev)}`, W / 2, Math.round(640 * scale));

  // Horizontal line
  drawHorizontalLine(ctx, W, Math.round(700 * scale));

  // Next event CTA
  ctx.font = `bold ${Math.round(28 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('CONFIRMA PRESENÇA NO PRÓXIMO!', W / 2, Math.round(760 * scale));

  ctx.font = `${Math.round(26 * scale)}px Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.fillText('Veja resultados em 022runners.com.br', W / 2, Math.round(810 * scale));

  // Footer
  drawFooter(ctx, W, H, scale);
}

// ── component ─────────────────────────────────────────────────────────────────

export function SocialGeneratorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [postType, setPostType] = useState<PostType>('divulgacao');
  const [format, setFormat] = useState<FormatKey>('feed');
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .eq('status', 'published')
      .then(({ data }) => {
        const rows = (data ?? []) as EventRow[];
        setEvents(rows);
        if (rows[0]) setSelectedEvent(rows[0]);
      });
  }, [user]);

  const renderCanvas = useCallback(
    async (ev: EventRow, fmt: FormatKey, bg: HTMLImageElement | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const fmtDef = FORMATS.find(f => f.key === fmt) ?? FORMATS[0];
      canvas.width = fmtDef.w;
      canvas.height = fmtDef.h;

      if (postType === 'divulgacao') {
        await renderDivulgacao(ctx, fmtDef.w, fmtDef.h, ev, bg);
      } else {
        await renderResultado(ctx, fmtDef.w, fmtDef.h, ev, bg);
      }

      setImageDataUrl(canvas.toDataURL('image/png'));
    },
    [postType],
  );

  const handleGenerateClick = () => {
    if (!selectedEvent) { toast.error('Selecione um evento.'); return; }
    setShowModal(true);
  };

  const handleChoosePhoto = () => {
    setShowModal(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent) return;
    setGenerating(true);
    const img = new Image();
    img.onload = async () => {
      setBgImage(img);
      await renderCanvas(selectedEvent, format, img);
      setGenerating(false);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  const handlePremiumBg = async () => {
    setShowModal(false);
    if (!selectedEvent) return;
    setGenerating(true);
    setBgImage(null);
    await renderCanvas(selectedEvent, format, null);
    setGenerating(false);
  };

  const handleFormatChange = async (fmt: FormatKey) => {
    setFormat(fmt);
    if (selectedEvent && imageDataUrl) {
      setGenerating(true);
      await renderCanvas(selectedEvent, fmt, bgImage);
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const fmtDef = FORMATS.find(f => f.key === format) ?? FORMATS[0];
    const a = document.createElement('a');
    a.download = `022runners-${postType}-${fmtDef.w}x${fmtDef.h}.png`;
    a.href = imageDataUrl;
    a.click();
    toast.success('Imagem baixada!');
  };

  const currentFmt = FORMATS.find(f => f.key === format) ?? FORMATS[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-widest" style={{ color: GOLD }}>
          GERADOR DE POSTS
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Crie posts profissionais para seus eventos</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-6">

        {/* SEÇÃO 1 — Seletor de evento */}
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: GOLD + '55', backgroundColor: '#0a0a0a' }}>
          <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>SEÇÃO 1 — EVENTO</h2>
          <select
            value={selectedEvent?.id ?? ''}
            onChange={e => setSelectedEvent(events.find(ev => ev.id === e.target.value) ?? null)}
            className="w-full rounded-lg px-4 py-3 text-sm font-medium focus:outline-none"
            style={{ backgroundColor: '#111', border: `1px solid ${GOLD}55`, color: '#fff' }}
          >
            <option value="">Selecione um evento...</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          {selectedEvent && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              {selectedEvent.date && <span>📅 {fmtDate(selectedEvent.date)}</span>}
              {(selectedEvent.city || selectedEvent.state) && <span>📍 {eventLocation(selectedEvent)}</span>}
              {eventDistance(selectedEvent) && <span>🏃 {eventDistance(selectedEvent)}</span>}
              {selectedEvent.price && <span>💰 {eventPrice(selectedEvent)}</span>}
            </div>
          )}
        </div>

        {/* SEÇÃO 2 — Tipo de post */}
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: GOLD + '55', backgroundColor: '#0a0a0a' }}>
          <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>SEÇÃO 2 — TIPO DE POST</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['divulgacao', 'resultado'] as PostType[]).map(type => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className="py-4 rounded-xl font-bold text-sm tracking-wider transition-all"
                style={postType === type
                  ? { backgroundColor: GOLD, color: '#000', border: `2px solid ${GOLD}` }
                  : { backgroundColor: '#111', color: GOLD, border: `2px solid ${GOLD}55` }}
              >
                {type === 'divulgacao' ? '🚀 DIVULGAÇÃO' : '🏆 RESULTADO'}
                <span className="block text-xs font-normal mt-1 opacity-70">
                  {type === 'divulgacao' ? 'Inscrições abertas' : 'Parabéns corredores'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* SEÇÃO 3 — Formato */}
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: GOLD + '55', backgroundColor: '#0a0a0a' }}>
          <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>SEÇÃO 3 — FORMATO</h2>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map(f => (
              <button
                key={f.key}
                onClick={() => handleFormatChange(f.key as FormatKey)}
                className="py-3 rounded-xl text-xs font-bold tracking-wide transition-all"
                style={format === f.key
                  ? { backgroundColor: GOLD, color: '#000', border: `2px solid ${GOLD}` }
                  : { backgroundColor: '#111', color: GOLD, border: `2px solid ${GOLD}55` }}
              >
                {f.label}
                <span className="block font-normal opacity-60 mt-0.5">{f.w}×{f.h}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão Gerar Post */}
        <button
          onClick={handleGenerateClick}
          disabled={generating || !selectedEvent}
          className="w-full py-5 rounded-xl text-lg font-bold tracking-widest transition-all disabled:opacity-40"
          style={{ backgroundColor: GOLD, color: '#000' }}
        >
          {generating ? 'GERANDO...' : '✨ GERAR POST'}
        </button>

        {/* SEÇÃO 4 — Preview + Download */}
        {imageDataUrl && (
          <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: GOLD, backgroundColor: '#0a0a0a' }}>
            <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>SEÇÃO 4 — PREVIEW</h2>
            <div
              className="w-full overflow-hidden rounded-lg mx-auto"
              style={{ border: `2px solid ${GOLD}`, maxWidth: 480 }}
            >
              <img
                src={imageDataUrl}
                alt="Preview do post"
                className="w-full h-auto block"
                style={{ aspectRatio: `${currentFmt.w}/${currentFmt.h}` }}
              />
            </div>
            <p className="text-center text-xs text-gray-500">
              {currentFmt.w}×{currentFmt.h}px • PNG
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm tracking-wider"
                style={{ backgroundColor: '#000', border: `2px solid ${GOLD}`, color: GOLD }}
              >
                <Download size={16} /> BAIXAR PNG
              </button>
              <button
                onClick={handleGenerateClick}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm tracking-wider"
                style={{ backgroundColor: GOLD, color: '#000' }}
              >
                ✨ NOVO POST
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de seleção de fundo */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: '#111', border: `2px solid ${GOLD}`, boxShadow: `0 0 40px ${GOLD}33` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg tracking-wider" style={{ color: GOLD }}>ESCOLHA O FUNDO</h3>
              <button onClick={() => setShowModal(false)} style={{ color: '#666' }}>
                <X size={20} />
              </button>
            </div>

            <button
              onClick={handleChoosePhoto}
              className="w-full rounded-xl p-5 text-left transition-all hover:opacity-90"
              style={{ backgroundColor: '#1a1a1a', border: `1px solid ${GOLD}55` }}
            >
              <div className="text-3xl mb-2">📷</div>
              <div className="font-bold text-white">USAR FOTO DO EVENTO</div>
              <div className="text-xs text-gray-400 mt-1">Faça upload de uma foto real</div>
            </button>

            <button
              onClick={handlePremiumBg}
              className="w-full rounded-xl p-5 text-left transition-all hover:opacity-90"
              style={{ backgroundColor: '#1a1a1a', border: `1px solid ${GOLD}55` }}
            >
              <div className="text-3xl mb-2">✨</div>
              <div className="font-bold" style={{ color: GOLD }}>GERAR FUNDO PREMIUM</div>
              <div className="text-xs text-gray-400 mt-1">Criamos um visual profissional</div>
            </button>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
