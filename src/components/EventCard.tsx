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
      {/* Imagem — apenas badge de plano e botão favorito sobre a foto */}
      <div className="relative">
        <img
          src={event.banner || '/images/event-banner-praia.jpg'}
          alt={event.name}
          className="w-full h-48 md:h-56 object-cover object-top"
        />
        {event.plan === 'premium' && (
          <span className="absolute top-3 left-3 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">PREMIUM</span>
        )}
        {event.plan === 'featured' && (
          <span className="absolute top-3 left-3 bg-[#C9A84C] text-white px-2 py-0.5 rounded-full text-xs font-bold">DESTAQUE</span>
        )}
        {isAuthenticated && (
          <button
            onClick={toggleFavorite}
            disabled={toggling}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:scale-110 transition-transform"
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart size={16} fill={favorited ? '#ef4444' : 'none'} stroke={favorited ? '#ef4444' : '#6b7280'} />
          </button>
        )}
      </div>

      {/* Conteúdo abaixo da imagem */}
      <div className="p-5">
        {/* Status + qualityScore na mesma linha */}
        <div className="flex items-center justify-between mb-3">
          {event.status === 'registration_open' ? (
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">Inscrições Abertas</span>
          ) : (
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs font-semibold">Encerrado</span>
          )}
          {event.qualityScore > 0 && (
            <span className="text-xs font-bold text-gray-500">⭐ {event.qualityScore}/100</span>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-1 leading-snug">{event.name}</h3>
        {event.subtitle && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{event.subtitle}</p>}

        <div className="space-y-1 text-sm text-gray-600 mb-4">
          <div>📅 {date}</div>
          <div>📍 {event.city} — {event.state}</div>
          {event.maxParticipants > 0 && (
            <div>👥 {event.currentParticipants}/{event.maxParticipants} vagas</div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-[#C9A84C] font-bold text-base">{priceRange}</span>
          <Link to={`/evento/${event.slug}`} className="text-[#C9A84C] hover:text-[#B8962E] font-semibold text-sm">Ver detalhes →</Link>
        </div>
      </div>
    </div>
  );
}
