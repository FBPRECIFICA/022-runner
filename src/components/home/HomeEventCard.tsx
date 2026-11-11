import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Users, Timer, Star, ArrowRight } from 'lucide-react';
import type { Event } from '../../types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { countdownLabel } from './countdown';

// Versão do EventCard usada SÓ na home (o original também aparece em
// /eventos e /busca e não pode mudar). Dados, preço e favoritos idênticos.
export function HomeEventCard({ event }: { event: Event }) {
  const { user, isAuthenticated } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const d = new Date(event.date);
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit' });
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const year = d.getFullYear();

  let priceRange: string;
  if (event.registrationTypes && event.registrationTypes.length > 0) {
    const kitMinPrice = Math.min(...event.registrationTypes.map(t => t.price));
    priceRange = `A partir de R$ ${kitMinPrice.toFixed(2).replace('.', ',')}`;
  } else {
    const minPrice = Math.min(...event.distances.map(d => d.price));
    const maxPrice = Math.max(...event.distances.map(d => d.price));
    priceRange = minPrice === maxPrice ? `R$ ${minPrice}` : `R$ ${minPrice} - R$ ${maxPrice}`;
  }

  const countdown = countdownLabel(event.date, now);
  // Público não vê quantas vagas restam (pedido 11/11/2026): só o aviso genérico.
  const spots = event.maxParticipants > 0 ? 'Vagas limitadas' : null;

  useEffect(() => {
    if (!user) return;
    supabase.from('favorites').select('id').eq('user_id', user.id).eq('event_id', event.id).maybeSingle()
      .then(({ data }) => setFavorited(!!data));
  }, [user, event.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated || !user) return;
    setToggling(true);
    if (favorited) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('event_id', event.id);
      setFavorited(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, event_id: event.id });
      setFavorited(true);
    }
    setToggling(false);
  };

  const label = 'inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider leading-none';

  return (
    <div className="hc-card relative h-full flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="relative h-48 overflow-hidden bg-gray-900">
        <img
          src={event.banner || '/images/event-banner-praia.jpg'}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110 opacity-50"
        />
        <img
          src={event.banner || '/images/event-banner-praia.jpg'}
          alt={event.name}
          className="hc-img relative w-full h-full object-contain"
        />
        {/* Data em destaque */}
        <div className="absolute left-3 bottom-3 bg-black text-white rounded-lg px-3 py-2 text-center leading-none">
          <div className="text-2xl font-extrabold tabular-nums">{day}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C9A84C] mt-1">{month} {year}</div>
        </div>
        {event.plan === 'premium' && (
          <span className={`${label} absolute top-3 left-3 bg-black/85 text-[#C9A84C]`}>Premium</span>
        )}
        {event.plan === 'featured' && (
          <span className={`${label} absolute top-3 left-3 bg-black/85 text-[#C9A84C]`}>Destaque</span>
        )}
        {isAuthenticated && (
          <button
            onClick={toggleFavorite}
            disabled={toggling}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart size={16} fill={favorited ? '#ef4444' : 'none'} stroke={favorited ? '#ef4444' : '#6b7280'} />
          </button>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          {event.status === 'registration_open' ? (
            <span className={`${label} bg-emerald-50 text-emerald-700`}>Inscrições Abertas</span>
          ) : (
            <span className={`${label} bg-gray-100 text-gray-500`}>Encerrado</span>
          )}
        </div>

        <h3 className="font-extrabold text-gray-900 text-lg leading-snug tracking-tight mb-1">{event.name}</h3>

        {event.subtitle && (
          <p className="text-gray-500 text-sm mb-4"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.subtitle}
          </p>
        )}

        <ul className="text-sm text-gray-700 mb-4 space-y-2">
          {countdown && (
            <li className="flex items-center gap-2 font-semibold text-gray-900">
              <Timer size={16} strokeWidth={1.75} className="text-[#C9A84C] flex-shrink-0" />
              <span className="tabular-nums">{countdown}</span>
            </li>
          )}
          <li className="flex items-center gap-2">
            <MapPin size={16} strokeWidth={1.75} className="text-[#C9A84C] flex-shrink-0" />
            {event.city} — {event.state}
          </li>
          {spots && (
            <li className="flex items-center gap-2">
              <Users size={16} strokeWidth={1.75} className="text-[#C9A84C] flex-shrink-0" />
              <span className="tabular-nums">{spots}</span>
            </li>
          )}
          {event.qualityScore > 0 && (
            <li className="flex items-center gap-2">
              <Star size={16} strokeWidth={1.75} className="text-[#C9A84C] flex-shrink-0" />
              Score {event.qualityScore}/100
            </li>
          )}
        </ul>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
          <span className="text-gray-900 font-bold text-base flex-shrink-0">{priceRange}</span>
          <Link
            to={`/evento/${event.slug}`}
            className="inline-flex items-center gap-1 text-[#C9A84C] hover:text-[#B8962E] font-semibold text-sm flex-shrink-0 whitespace-nowrap"
          >
            Ver detalhes <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </div>
  );
}
