import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, CheckCircle, Star, Timer } from 'lucide-react';
import { scoreBadge } from '../utils/scoreCalculator';
import { Helmet } from 'react-helmet-async';
import { trackEventView, trackShare } from '../utils/analytics';
import { ReviewSection } from '../components/ReviewSection';

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return timeLeft;
}

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase.from('events').select('*').eq('slug', slug).single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setEvent(data);
      trackEventView(data.title);
      if (data.organizer_id) {
        const { data: org } = await supabase.from('users').select('name, email').eq('id', data.organizer_id).single();
        setOrganizer(org);
      }
      setLoading(false);
    }
    fetchEvent();
  }, [slug]);

  const countdown = useCountdown(event?.date || '');

  const handleShare = async () => {
    trackShare(event?.title || '', 'clipboard');
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (navigator.share) navigator.share({ title: event?.title, url: window.location.href });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C]" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Evento não encontrado</h1>
      <p className="text-gray-500 mb-6">O evento que você procura não existe ou foi removido.</p>
      <Link to="/" className="bg-[#C9A84C] text-white px-6 py-3 rounded-lg hover:bg-[#B8962E] font-medium">Voltar ao início</Link>
    </div>
  );

  const eventDate = new Date(event.date);
  const deadline = event.registration_deadline ? new Date(event.registration_deadline) : null;
  const distances: { name: string; price: number }[] = event.distances || [];
  const maxP = event.max_participants || 0;
  const currentP = event.current_participants || 0;
  const progressPct = maxP > 0 ? Math.min(Math.round((currentP / maxP) * 100), 100) : 0;
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000)) : null;
  const score = event.quality_score || 0;
  const isPast = eventDate.getTime() < Date.now();

  const sponsors: { name: string; logo_url: string }[] = event.sponsors || [];
  const metaDesc = event.description ? event.description.slice(0, 160) : `${event.title} — ${event.city}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{event.title} — 022 RUNNER</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={`${event.title} — 022 RUNNER`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:image" content={event.banner_url || '/images/hero-bg.jpg'} />
        <meta property="og:url" content={`https://022runner.com.br/evento/${event.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.title} />
        <meta name="twitter:image" content={event.banner_url || '/images/hero-bg.jpg'} />
      </Helmet>

      {/* Banner */}
      <div className="relative w-full bg-gray-900" style={{ height: '400px' }}>
        {event.banner_url
          ? <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-blue-800 to-[#C9A84C]" />
        }
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 40%, rgba(0,0,0,0.25) 100%)' }} />
        <div className="absolute top-4 left-4">
          <Link to="/" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <ChevronLeft size={16} /> Voltar
          </Link>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex flex-wrap gap-2 mb-3">
            {event.status === 'published' && (
              <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">INSCRIÇÕES ABERTAS</span>
            )}
            {score > 0 && (() => {
              const b = scoreBadge(score);
              return (
                <span className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: b.bg, color: b.color }}>
                  {b.label}
                </span>
              );
            })()}
            {event.event_type && (
              <span className="bg-[#C9A84C]/80 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">{event.event_type}</span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">{event.title}</h1>
          <p className="text-white/80 mt-2 text-base md:text-lg">{event.city} — RJ</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* COLUNA PRINCIPAL */}
          <div className="md:col-span-2 space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: <Calendar size={20} className="text-[#C9A84C]" />, label: 'Data', value: eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { icon: <Clock size={20} className="text-[#C9A84C]" />, label: 'Horário', value: eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) },
                { icon: <MapPin size={20} className="text-[#C9A84C]" />, label: 'Cidade', value: event.city },
                { icon: <Users size={20} className="text-[#C9A84C]" />, label: 'Vagas', value: maxP > 0 ? `${currentP}/${maxP}` : 'Ilimitado' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border p-3 flex flex-col items-center text-center gap-1 shadow-sm">
                  {item.icon}
                  <p className="text-xs text-gray-400 font-medium">{item.label}</p>
                  <p className="text-sm font-bold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Local */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-500">
                <MapPin size={15} /> Local de Largada
              </h2>
              <p className="text-gray-800 font-medium mt-1">{event.location}</p>
            </div>

            {/* Countdown */}
            {!isPast && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4 flex items-center gap-2">
                  <Timer size={15} /> Contagem Regressiva
                </h2>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { value: countdown.days, label: 'Dias' },
                    { value: countdown.hours, label: 'Horas' },
                    { value: countdown.minutes, label: 'Min' },
                    { value: countdown.seconds, label: 'Seg' },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center rounded-xl py-4"
                      style={{ backgroundColor: '#000', color: '#C9A84C' }}>
                      <span className="text-3xl font-bold tabular-nums" style={{ color: '#C9A84C' }}>
                        {String(item.value).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold mt-1" style={{ color: '#ffffff99' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Descrição */}
            {event.description && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Sobre o Evento</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {/* Regulamento */}
            {event.additional_info && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Regulamento / Informações</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.additional_info}</p>
              </div>
            )}

            {/* Distâncias */}
            {distances.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4">Distâncias e Preços</h2>
                <div className="space-y-2">
                  {distances.map((d, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-xs">{d.name}</span>
                        </div>
                        <span className="font-semibold text-gray-900">{d.name}</span>
                      </div>
                      <span className="text-[#C9A84C] font-bold text-xl">R$ {Number(d.price).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kit */}
            {event.kit_items && event.kit_items.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Kit do Evento</h2>
                <div className="flex flex-wrap gap-2">
                  {event.kit_items.map((item: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-sm font-medium px-3 py-1.5 rounded-full">
                      <CheckCircle size={13} /> {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Patrocinadores */}
            {sponsors.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4">Realização e Patrocínio</h2>
                <div className="flex flex-wrap gap-4 items-center">
                  {sponsors.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.name} className="h-12 w-auto object-contain" />
                      ) : (
                        <div className="h-12 w-20 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">{s.name}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Organizador */}
            {organizer && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Organizador</h2>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center font-bold text-[#C9A84C]">
                    {organizer.name?.charAt(0)?.toUpperCase() || 'O'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{organizer.name}</p>
                    <p className="text-sm text-gray-500">{organizer.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Avaliações */}
            <ReviewSection eventId={event.id} />
          </div>

          {/* COLUNA LATERAL — CTA */}
          <div className="space-y-4">
            {/* Barra de Progresso */}
            {maxP > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h3 className="font-bold text-sm text-gray-500 uppercase tracking-wide mb-3">Vagas Preenchidas</h3>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div className="h-3 rounded-full transition-all bg-[#C9A84C]" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="font-semibold text-[#C9A84C]">{progressPct}%</span>
                  <span>{maxP - currentP} restantes</span>
                </div>
              </div>
            )}

            {/* Prazo */}
            {deadline && (
              <div className={`rounded-xl border p-4 ${daysLeft! <= 7 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Prazo de Inscrição</p>
                <p className="font-bold text-gray-900">
                  {deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                {daysLeft !== null && (
                  <p className={`text-sm mt-1 font-semibold ${daysLeft <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                    {daysLeft === 0 ? 'Último dia!' : `${daysLeft} dias restantes`}
                  </p>
                )}
              </div>
            )}

            {/* Botão Inscrever */}
            <button
              onClick={() => navigate(`/inscricao/${event.slug}`)}
              className="w-full font-bold py-5 rounded-xl text-lg transition-all duration-200 shadow-lg text-white"
              style={{ backgroundColor: '#C9A84C', boxShadow: '0 4px 20px rgba(37,99,235,0.4)' }}
              onMouseOver={e => (e.currentTarget.style.backgroundColor = '#B8962E')}
              onMouseOut={e => (e.currentTarget.style.backgroundColor = '#C9A84C')}
            >
              INSCREVER-SE
            </button>

            {/* Compartilhamento social */}
            <div className="bg-white rounded-xl border p-4 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Compartilhar</p>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${event.title} 🏃 ${window.location.href}`)}`}
                target="_blank" rel="noreferrer"
                onClick={() => trackShare(event.title, 'whatsapp')}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors">
                <Share2 size={14} /> WhatsApp
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noreferrer"
                onClick={() => trackShare(event.title, 'facebook')}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#1877f2' }}>
                <Share2 size={14} /> Facebook
              </a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${event.title} 🏃`)}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank" rel="noreferrer"
                onClick={() => trackShare(event.title, 'twitter')}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-white bg-black hover:bg-gray-900 transition-colors">
                <Share2 size={14} /> X / Twitter
              </a>
              <button onClick={handleShare}
                className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-colors"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}>
                {copied ? <CheckCircle size={14} className="text-green-500" /> : <Share2 size={14} />}
                {copied ? 'Copiado!' : 'Copiar link'}
              </button>
            </div>

            {/* Link direto */}
            <div className="bg-gray-50 rounded-xl p-3 border">
              <p className="text-xs text-gray-400 mb-1">Link do evento</p>
              <p className="text-xs text-[#C9A84C] font-mono break-all">022runner.com.br/evento/{event.slug}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
