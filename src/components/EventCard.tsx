import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { Event } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [favorited, setFavorited] = useState(false);
  const [toggling, setToggling] = useState(false);

  const date = new Date(event.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const minPrice = Math.min(...event.distances.map(d => d.price));
  const maxPrice = Math.max(...event.distances.map(d => d.price));
  const priceRange = minPrice === maxPrice ? `R$ ${minPrice}` : `R$ ${minPrice} - R$ ${maxPrice}`;

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

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagem */}
      <div className="relative">
        <img
          src={event.banner || '/images/event-banner-praia.jpg'}
          alt={event.name}
          className="w-full h-44 object-cover object-top block"
        />
        {event.plan === 'premium' && (
          <span className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold leading-none">
            PREMIUM
          </span>
        )}
        {event.plan === 'featured' && (
          <span className="absolute top-2 left-2 bg-[#C9A84C] text-white px-2 py-1 rounded-full text-xs font-bold leading-none">
            DESTAQUE
          </span>
        )}
        {isAuthenticated && (
          <button
            onClick={toggleFavorite}
            disabled={toggling}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow"
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart size={16} fill={favorited ? '#ef4444' : 'none'} stroke={favorited ? '#ef4444' : '#6b7280'} />
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Badge status — bloco isolado, nunca comprimido */}
        <div className="mb-2">
          {event.status === 'registration_open' ? (
            <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
              Inscrições Abertas
            </span>
          ) : (
            <span className="inline-block bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-semibold">
              Encerrado
            </span>
          )}
        </div>

        {/* Nome */}
        <h3 className="font-bold text-gray-900 text-base mb-1" style={{ lineHeight: '1.35' }}>
          {event.name}
        </h3>

        {/* Subtitle com clamp seguro */}
        {event.subtitle && (
          <p className="text-gray-500 text-sm mb-3"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {event.subtitle}
          </p>
        )}

        {/* Infos em lista vertical — sem flex-row que comprime */}
        <div className="text-sm text-gray-600 mb-3 space-y-1">
          <p>📅 {date}</p>
          <p>📍 {event.city} — {event.state}</p>
          {event.maxParticipants > 0 && (
            <p>👥 Vagas limitadas</p>
          )}
          {event.qualityScore > 0 && (
            <p>⭐ Score {event.qualityScore}/100</p>
          )}
        </div>

        {/* Preço + link — flex-shrink-0 nos dois para nunca sobrepor */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
          <span className="text-[#C9A84C] font-bold text-base flex-shrink-0">{priceRange}</span>
          <Link
            to={`/evento/${event.slug}`}
            className="text-[#C9A84C] hover:text-[#B8962E] font-semibold text-sm flex-shrink-0 whitespace-nowrap"
          >
            Ver detalhes →
          </Link>
        </div>
      </div>
    </div>
  );
}
