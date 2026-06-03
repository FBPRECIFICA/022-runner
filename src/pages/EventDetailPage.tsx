import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Clock, Users, Share2, ChevronLeft, CheckCircle } from 'lucide-react';

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setEvent(data);
      }
      setLoading(false);
    }
    fetchEvent();
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (navigator.share) {
        navigator.share({ title: event?.title, url });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Evento não encontrado</h1>
        <p className="text-gray-500 mb-6">O evento que você procura não existe ou foi removido.</p>
        <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium">
          Voltar ao início
        </Link>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const deadline = event.registration_deadline ? new Date(event.registration_deadline) : null;
  const distances: { name: string; price: number }[] = event.distances || [];
  const maxP = event.max_participants || 0;
  const currentP = event.current_participants || 0;
  const progressPct = maxP > 0 ? Math.min(Math.round((currentP / maxP) * 100), 100) : 0;

  const daysLeft = deadline
    ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      <div className="relative w-full h-64 md:h-96 bg-gray-200">
        {event.banner_url ? (
          <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <Link to="/" className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3">
            <ChevronLeft size={16} /> Voltar
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">{event.title}</h1>
          {event.status === 'published' && (
            <span className="inline-block mt-2 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              Inscrições Abertas
            </span>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4 flex flex-col items-center text-center gap-1">
            <Calendar size={22} className="text-blue-600" />
            <p className="text-xs text-gray-500 font-medium">Data</p>
            <p className="text-sm font-bold text-gray-900">
              {eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4 flex flex-col items-center text-center gap-1">
            <Clock size={22} className="text-blue-600" />
            <p className="text-xs text-gray-500 font-medium">Horário</p>
            <p className="text-sm font-bold text-gray-900">
              {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4 flex flex-col items-center text-center gap-1">
            <MapPin size={22} className="text-blue-600" />
            <p className="text-xs text-gray-500 font-medium">Cidade</p>
            <p className="text-sm font-bold text-gray-900">{event.city}</p>
          </div>
          <div className="bg-white rounded-xl border p-4 flex flex-col items-center text-center gap-1">
            <Users size={22} className="text-blue-600" />
            <p className="text-xs text-gray-500 font-medium">Vagas</p>
            <p className="text-sm font-bold text-gray-900">{maxP > 0 ? `${currentP}/${maxP}` : 'Ilimitado'}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left: Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Local */}
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <MapPin size={18} className="text-blue-600" /> Local de Largada
              </h2>
              <p className="text-gray-700">{event.location}</p>
            </div>

            {/* Descrição */}
            {event.description && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-bold text-gray-900 mb-3">Sobre o Evento</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{event.description}</p>
              </div>
            )}

            {/* Distâncias */}
            {distances.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h2 className="font-bold text-gray-900 mb-4">Distâncias e Preços</h2>
                <div className="space-y-3">
                  {distances.map((d, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-xs">{d.name}</span>
                        </div>
                        <span className="font-medium text-gray-900">{d.name}</span>
                      </div>
                      <span className="text-blue-600 font-bold text-lg">
                        R$ {Number(d.price).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: CTA + Progress */}
          <div className="space-y-4">
            {/* Barra de Progresso */}
            {maxP > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-gray-900 mb-3 text-sm">Vagas Preenchidas</h3>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                  <div
                    className="h-3 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{progressPct}% preenchido</span>
                  <span>{maxP - currentP} vagas restantes</span>
                </div>
              </div>
            )}

            {/* Prazo */}
            {deadline && (
              <div className={`rounded-xl border p-4 ${daysLeft! <= 7 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <p className="text-xs font-semibold text-gray-500 mb-1">PRAZO DE INSCRIÇÃO</p>
                <p className="font-bold text-gray-900">
                  {deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                {daysLeft !== null && (
                  <p className={`text-sm mt-1 font-medium ${daysLeft <= 7 ? 'text-red-600' : 'text-gray-500'}`}>
                    {daysLeft === 0 ? 'Último dia!' : `${daysLeft} dias restantes`}
                  </p>
                )}
              </div>
            )}

            {/* Botão Inscrever-se */}
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg shadow-blue-200">
              Inscrever-se
            </button>

            {/* Botão Compartilhar */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-3 rounded-xl transition-colors"
            >
              {copied ? <CheckCircle size={18} className="text-green-600" /> : <Share2 size={18} />}
              {copied ? 'Link copiado!' : 'Compartilhar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
