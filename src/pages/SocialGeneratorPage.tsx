import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Download, X, Loader2 } from 'lucide-react';
import { generateEventPost, type EventPostData } from '../lib/postGenerator';

const GOLD = '#C9A84C';

type PostType = 'divulgacao' | 'resultado';

interface EventRow extends EventPostData {
  id: string;
  title: string;
  status?: string;
  organizer_id?: string;
}

const FORMATS = [
  { key: 'feed', label: 'Feed Instagram', w: 1080, h: 1080 },
  { key: 'stories', label: 'Stories Instagram', w: 1080, h: 1920 },
  { key: 'whatsapp', label: 'WhatsApp', w: 800, h: 800 },
];

export function SocialGeneratorPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [postType, setPostType] = useState<PostType>('divulgacao');
  const [format, setFormat] = useState('feed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultImage, setResultImage] = useState('');
  const [showModal, setShowModal] = useState(false);
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

  const runGeneration = async (imageFile?: File | null) => {
    if (!selectedEvent) return;
    setLoading(true);
    setError('');
    setResultImage('');
    try {
      const png = await generateEventPost(selectedEvent, postType, imageFile ?? null);
      setResultImage(png);
      toast.success('Post gerado com sucesso!');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao gerar post.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
    e.target.value = '';
    if (!file) return;
    await runGeneration(file);
  };

  const handlePremiumBg = async () => {
    setShowModal(false);
    await runGeneration(null);
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const fmt = FORMATS.find(f => f.key === format) ?? FORMATS[0];
    const a = document.createElement('a');
    a.download = `022runners-${postType}-${fmt.w}x${fmt.h}.png`;
    a.href = resultImage;
    a.click();
    toast.success('Imagem baixada!');
  };

  const fmtDef = FORMATS.find(f => f.key === format) ?? FORMATS[0];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#000000' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-widest" style={{ color: GOLD }}>
          GERADOR DE POSTS
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Posts profissionais gerados por IA para seus eventos
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12 space-y-6">

        {/* SEÇÃO 1 — Evento */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ borderColor: GOLD + '55', backgroundColor: '#0a0a0a' }}
        >
          <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>
            SEÇÃO 1 — EVENTO
          </h2>
          <select
            value={selectedEvent?.id ?? ''}
            onChange={e =>
              setSelectedEvent(events.find(ev => ev.id === e.target.value) ?? null)
            }
            className="w-full rounded-lg px-4 py-3 text-sm font-medium focus:outline-none"
            style={{ backgroundColor: '#111', border: `1px solid ${GOLD}55`, color: '#fff' }}
          >
            <option value="">Selecione um evento...</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          {selectedEvent && (
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              {selectedEvent.date && (
                <span>
                  📅{' '}
                  {new Date(selectedEvent.date).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              )}
              {selectedEvent.city && <span>📍 {selectedEvent.city}</span>}
              {(selectedEvent.distance ?? selectedEvent.category) && (
                <span>🏃 {selectedEvent.distance ?? selectedEvent.category}</span>
              )}
              {selectedEvent.price && <span>💰 R$ {selectedEvent.price}</span>}
            </div>
          )}
        </div>

        {/* SEÇÃO 2 — Tipo de post */}
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ borderColor: GOLD + '55', backgroundColor: '#0a0a0a' }}
        >
          <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>
            SEÇÃO 2 — TIPO DE POST
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(['divulgacao', 'resultado'] as PostType[]).map(type => (
              <button
                key={type}
                onClick={() => setPostType(type)}
                className="py-4 rounded-xl font-bold text-sm tracking-wider transition-all"
                style={
                  postType === type
                    ? { backgroundColor: GOLD, color: '#000', border: `2px solid ${GOLD}` }
                    : { backgroundColor: '#111', color: GOLD, border: `2px solid ${GOLD}55` }
                }
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
        <div
          className="rounded-xl border p-5 space-y-3"
          style={{ borderColor: GOLD + '55', backgroundColor: '#0a0a0a' }}
        >
          <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>
            SEÇÃO 3 — FORMATO
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {FORMATS.map(f => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className="py-3 rounded-xl text-xs font-bold tracking-wide transition-all"
                style={
                  format === f.key
                    ? { backgroundColor: GOLD, color: '#000', border: `2px solid ${GOLD}` }
                    : { backgroundColor: '#111', color: GOLD, border: `2px solid ${GOLD}55` }
                }
              >
                {f.label}
                <span className="block font-normal opacity-60 mt-0.5">
                  {f.w}×{f.h}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão Gerar Post */}
        <button
          onClick={handleGenerateClick}
          disabled={loading || !selectedEvent}
          className="w-full py-5 rounded-xl text-lg font-bold tracking-widest transition-all disabled:opacity-40 flex items-center justify-center gap-3"
          style={{ backgroundColor: GOLD, color: '#000' }}
        >
          {loading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              GERANDO POST PROFISSIONAL...
            </>
          ) : (
            '✨ GERAR POST'
          )}
        </button>

        {/* Erro */}
        {error && (
          <div
            className="rounded-xl p-4 text-sm"
            style={{ backgroundColor: '#1a0000', border: '1px solid #ff4444', color: '#ff8888' }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* SEÇÃO 4 — Preview + Download */}
        {resultImage && (
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: GOLD, backgroundColor: '#0a0a0a' }}
          >
            <h2 className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>
              SEÇÃO 4 — PREVIEW
            </h2>
            <div
              className="w-full overflow-hidden rounded-lg mx-auto"
              style={{ border: `2px solid ${GOLD}`, maxWidth: 480 }}
            >
              <img
                src={resultImage}
                alt="Post gerado"
                className="w-full h-auto block"
                style={{ aspectRatio: `${fmtDef.w}/${fmtDef.h}` }}
              />
            </div>
            <p className="text-center text-xs text-gray-500">
              {fmtDef.w}×{fmtDef.h}px • PNG gerado por IA
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
            style={{
              backgroundColor: '#111',
              border: `2px solid ${GOLD}`,
              boxShadow: `0 0 40px ${GOLD}33`,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg tracking-wider" style={{ color: GOLD }}>
                ESCOLHA O FUNDO
              </h3>
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
              <div className="text-xs text-gray-400 mt-1">
                Faça upload de uma foto real
              </div>
            </button>

            <button
              onClick={handlePremiumBg}
              className="w-full rounded-xl p-5 text-left transition-all hover:opacity-90"
              style={{ backgroundColor: '#1a1a1a', border: `1px solid ${GOLD}55` }}
            >
              <div className="text-3xl mb-2">✨</div>
              <div className="font-bold" style={{ color: GOLD }}>
                GERAR FUNDO PREMIUM
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Criamos um visual profissional
              </div>
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
