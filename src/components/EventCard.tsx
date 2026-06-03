import { Link } from 'react-router-dom';
import type { Event } from '../types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const date = new Date(event.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const minPrice = Math.min(...event.distances.map(d => d.price));
  const maxPrice = Math.max(...event.distances.map(d => d.price));
  const priceRange = minPrice === maxPrice ? `R$ ${minPrice}` : `R$ ${minPrice} - R$ ${maxPrice}`;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <img 
          src={event.banner || '/images/event-banner-praia.jpg'} 
          alt={event.name}
          className="w-full h-48 object-cover"
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
