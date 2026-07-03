import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, CheckCircle, Star, Timer, ImageIcon } from 'lucide-react';
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
  const [eventPhotos, setEventPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase.from('events')
        .select('*, registrations(count)')
        .in('registrations.status', ['paid', 'confirmed', 'presente'])
        .eq('slug', slug).single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setEvent(data);
      trackEventView(data.title);
      if (data.organizer_id) {
        const { data: org } = await supabase.from('users').select('name, email').eq('id', data.organizer_id).single();
        setOrganizer(org);
      }
      const { data: photos } = await supabase.from('event_photos').select('*').eq('event_id', data.id);
      setEventPhotos(photos || []);
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
  const currentP = event.registrations?.[0]?.count ?? event.current_participants ?? 0;
  const progressPct = maxP > 0 ? Math.min(Math.round((currentP / maxP) * 100), 100) : 0;
  const progressColor = progressPct >= 80 ? '#ef4444' : progressPct >= 50 ? '#f59e0b' : '#22c55e';
  const daysLeft = deadline ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000)) : null;
  const score = event.quality_score || 0;
  const isPast = eventDate.getTime() < Date.now();
  const sponsors: { name: string; logo_url: string }[] = event.sponsors || [];
  const kitItems: string[] = event.kit_items || [];
  const metaDesc = event.description ? event.description.slice(0, 160) : `${event.title} — ${event.city}`;

  const mapsUrl = event.latitude && event.longitude
    ? `https://www.google.com/maps?q=${event.latitude},${event.longitude}`
    : `https://www.google.com/maps/search/${encodeURIComponent(event.location + ' ' + event.city)}`;
  const wazeUrl = event.latitude && event.longitude
    ? `https://waze.com/ul?ll=${event.latitude},${event.longitude}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(event.location + ' ' + event.city)}`;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-0">
      <Helmet>
        <title>{event.title} — 022 RUNNER</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={`${event.title} — 022 RUNNER`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:image" content={event.banner_url || '/images/hero-bg.jpg'} />
        <meta property="og:url" content={`https://022runners.com.br/evento/${event.slug}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.title} />
        <meta name="twitter:image" content={event.banner_url || '/images/hero-bg.jpg'} />
      </Helmet>

      {/* Hero Banner — foto limpa, sem texto sobreposto */}
      <div className="w-full bg-gray-900" style={{ height: '380px' }}>
        {event.banner_url
          ? <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover block" style={{ objectPosition: 'top center' }} />
          : <div className="w-full h-full bg-gradient-to-br from-blue-800 to-[#C9A84C]" />
        }
      </div>

      {/* Cabeçalho do evento — abaixo da foto, sem sobreposição */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <Link to="/" className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-700 text-sm mb-3">
            <ChevronLeft size={16} /> Voltar
          </Link>
          <div className="flex flex-wrap gap-2 mb-3">
            {event.status === 'published' && (
              <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">Inscrições Abertas</span>
            )}
            {score > 0 && (() => {
              const b = scoreBadge(score);
              return (
                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full"
                  style={{ backgroundColor: b.bg, color: b.color }}>
                  ⭐ {b.label}
                </span>
              );
            })()}
            {event.event_type && (
              <span className="inline-block bg-[#C9A84C]/20 text-[#8a6d20] text-xs font-semibold px-3 py-1 rounded-full">{event.event_type}</span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">{event.title}</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-1.5 text-sm">
            <MapPin size={14} /> {event.city} — RJ
          </p>
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
              <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-1 flex items-center gap-2">
                <MapPin size={15} /> Local de Largada
              </h2>
              <p className="text-gray-800 font-medium mt-1">{event.location}</p>
            </div>

            {/* Countdown */}
            {!isPast && (
              <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)', border: '1px solid #C9A84C33' }}>
                <div className="px-5 pt-5 pb-2">
                  <h2 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2" style={{ color: '#C9A84C' }}>
                    <Timer size={14} /> Contagem Regressiva
                  </h2>
                </div>
                <div className="grid grid-cols-4 gap-3 px-5 pb-5">
                  {[
                    { value: countdown.days, label: 'Dias' },
                    { value: countdown.hours, label: 'Horas' },
                    { value: countdown.minutes, label: 'Min' },
                    { value: countdown.seconds, label: 'Seg' },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center justify-center rounded-xl py-4"
                      style={{ backgroundColor: '#111', border: '1px solid #C9A84C44' }}>
                      <span className="text-4xl font-black tabular-nums" style={{ color: '#C9A84C' }}>
                        {String(item.value).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold mt-1 uppercase tracking-wide" style={{ color: '#ffffff55' }}>{item.label}</span>
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

            {/* Percurso */}
            {(event.route_description || event.location || event.link_percurso) && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                  <MapPin size={15} /> Percurso
                </h2>
                {event.route_description && (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-3">{event.route_description}</p>
                )}
                {event.total_distance_km && (
                  <p className="text-sm text-gray-600 mb-3 font-medium">Distância total: <span style={{ color: '#C9A84C' }}>{event.total_distance_km} km</span></p>
                )}
                {event.link_percurso ? (
                  <>
                    <img
                      src="/percurso-arena-mmp.png"
                      alt="Mapa do percurso"
                      width="100%"
                      style={{ width: '100%', borderRadius: '8px', border: '2px solid #C9A84C' }}
                      className="mb-3"
                    />
                    <a
                      href={event.link_percurso}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-base font-bold px-6 py-3 rounded-lg text-white shadow-sm mb-3"
                      style={{ backgroundColor: '#C9A84C' }}
                    >
                      🗺️ Ver Percurso Completo no Garmin
                    </a>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                      <span>Distância: <span className="font-medium" style={{ color: '#C9A84C' }}>5.01km</span></span>
                      <span>Subida: <span className="font-medium text-gray-700">27m</span></span>
                      <span>Descida: <span className="font-medium text-gray-700">28m</span></span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 italic">Percurso será divulgado em breve</p>
                )}
              </div>
            )}

            {/* Regulamento */}
            {(event.regulations || event.additional_info) && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Regulamento</h2>
                <div className="max-h-96 overflow-y-auto pr-1">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.regulations || event.additional_info}</p>
                </div>
              </div>
            )}

            {/* Distâncias — cards premium */}
            {distances.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4">Distâncias e Preços</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {distances.map((d, i) => (
                    <div key={i}
                      className="rounded-xl p-4 flex flex-col gap-2 cursor-pointer transition-all hover:shadow-md"
                      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1c1c1c 100%)', border: '1px solid #C9A84C44' }}
                    >
                      <span className="text-2xl font-black" style={{ color: '#C9A84C' }}>{d.name}</span>
                      <span className="text-white/60 text-xs uppercase tracking-widest">Inscrição</span>
                      <span className="text-2xl font-black text-white">R$ {Number(d.price).toFixed(2).replace('.', ',')}</span>
                      <button
                        onClick={() => navigate(`/inscricao/${event.slug}`)}
                        className="w-full py-2 rounded-lg text-xs font-bold mt-1 transition-all hover:opacity-90"
                        style={{ backgroundColor: '#C9A84C', color: '#000' }}
                      >
                        INSCREVER
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kit do evento */}
            {kitItems.length > 0 && (
              <div className="bg-white rounded-xl border p-5 shadow-sm">
                <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3">Kit do Evento</h2>
                <div className="flex flex-wrap gap-2">
                  {kitItems.map((item: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-200 text-sm font-medium px-3 py-1.5 rounded-full">
                      <CheckCircle size={13} /> {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Como chegar */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2">
                <MapPin size={15} /> Como Chegar
              </h2>
              <p className="text-gray-700 text-sm mb-4">{event.location} — {event.city}</p>
              <div className="flex gap-3">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#4285f4' }}
                >
                  <MapPin size={16} /> Google Maps
                </a>
                <a
                  href={wazeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#33ccff' }}
                >
                  <MapPin size={16} /> Waze
                </a>
              </div>
            </div>

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

            {/* Galeria de Fotos */}
            <div className="bg-white rounded-xl border p-5 shadow-sm">
              <h2 className="font-bold text-sm uppercase tracking-wide text-gray-500 mb-4 flex items-center gap-2">
                <ImageIcon size={15} /> Galeria
              </h2>
              {eventPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {eventPhotos.map((photo: any, i: number) => (
                    <div key={i} className="relative rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
                      <img
                        src={photo.photo_url || photo.url}
                        alt={`Foto ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400">
                  <ImageIcon size={36} className="mb-2 opacity-30" />
                  <p className="text-sm">Fotos serão adicionadas em breve</p>
                </div>
              )}
            </div>

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
                  <div className="h-3 rounded-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: progressColor }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span className="font-bold" style={{ color: progressColor }}>{progressPct}%</span>
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

            {/* Botão Inscrever — desktop */}
            <button
              onClick={() => navigate(`/inscricao/${event.slug}`)}
              className="w-full font-bold py-5 rounded-xl text-lg transition-all duration-200 shadow-lg"
              style={{ backgroundColor: '#C9A84C', color: '#000', boxShadow: '0 4px 20px rgba(201,168,76,0.4)' }}
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
              <p className="text-xs text-[#C9A84C] font-mono break-all">022runners.com.br/evento/{event.slug}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão flutuante mobile — INSCREVER-SE AGORA */}
      <div className="md:hidden fixed bottom-16 left-4 right-20 z-30">
        <button
          onClick={() => navigate(`/inscricao/${event.slug}`)}
          className="w-full font-black py-4 rounded-xl text-base shadow-2xl transition-all active:scale-95"
          style={{ backgroundColor: '#C9A84C', color: '#000', boxShadow: '0 4px 24px rgba(201,168,76,0.5)' }}
        >
          INSCREVER-SE AGORA
        </button>
      </div>
    </div>
  );
}
