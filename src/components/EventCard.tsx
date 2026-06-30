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
      <div className="relative">
        <img
          src={event.banner || '/images/event-banner-praia.jpg'}
          alt={event.name}
          className="w-full h-48 md:h-56 object-cover object-top"
        />
        {event.plan === 'premium' && (
          <span className="absolute top-4 left-4 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">PREMIUM</span>
        )}
        {event.plan === 'featured' && (
          <span className="absolute top-4 left-4 bg-[#C9A84C] text-white px-3 py-1 rounded-full text-xs font-bold">DESTAQUE</span>
        )}
        {event.status === 'registration_open' && (
          <span className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">Inscrições Abertas</span>
        )}
        {event.qualityScore > 0 && (
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-xl">
            <span className="text-sm font-bold text-gray-800">{event.qualityScore}/100</span>
          </div>
        )}
        {isAuthenticated && (
          <button
            onClick={toggleFavorite}
            disabled={toggling}
            className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow hover:scale-110 transition-transform"
            aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart size={18} fill={favorited ? '#ef4444' : 'none'} stroke={favorited ? '#ef4444' : '#6b7280'} />
          </button>
        )}
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{event.name}</h3>
        <p className="text-gray-600 text-sm mb-4">{event.subtitle}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
          <span>📅 {date}</span>
          <span>📍 {event.city} - {event.state}</span>
          <span>👥 {event.currentParticipants}/{event.maxParticipants}</span>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-[#C9A84C] font-bold text-lg">{priceRange}</span>
          <Link to={`/evento/${event.slug}`} className="text-[#C9A84C] hover:text-[#B8962E] font-semibold text-sm">Ver detalhes →</Link>
        </div>
      </div>
    </div>
  );
}
