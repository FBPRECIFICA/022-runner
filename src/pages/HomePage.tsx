import { useState, useEffect } from 'react';
import { NewsletterForm } from '../components/NewsletterForm';
import { HeroSection } from '../components/HeroSection';
import { EventCard } from '../components/EventCard';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Star, Award, Clock, ArrowRight, Sparkles, Trophy } from 'lucide-react';
import { events as mockEvents, LAGOS_REGION_CITIES } from '../data/mockData';
import { formatDate } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { Event } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const blueIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const CITY_COORDS: Record<string, [number, number]> = {
  'Cabo Frio':           [-22.8779, -42.0189],
  'Búzios':             [-22.7469, -41.8826],
  'São Pedro da Aldeia': [-22.8400, -42.1020],
  'Iguaba Grande':       [-22.8360, -42.2290],
  'Araruama':            [-22.8724, -42.3435],
  'Saquarema':           [-22.9200, -42.5100],
  'Macaé':              [-22.3710, -41.7870],
  'Bacaxá':             [-22.9550, -42.5720],
};

function supabaseToEvent(e: any): Event {
  const distances = (e.distances || []).map((d: any, i: number) => ({
    id: `d${i}`,
    name: d.name,
    distanceKm: parseFloat(d.name) || 0,
    price: Number(d.price),
  }));
  return {
    id: e.id,
    name: e.title,
    subtitle: e.description?.slice(0, 80) || '',
    description: e.description || '',
    date: e.date,
    startTime: new Date(e.date).toTimeString().slice(0, 5),
    city: e.city,
    state: 'RJ',
    startLocation: e.location || '',
    maxParticipants: e.max_participants || 0,
    currentParticipants: e.registrations?.[0]?.count ?? e.current_participants ?? 0,
    banner: e.banner_url || '',
    distances,
    qualityScore: e.quality_score || 0,
    plan: e.plan || 'free',
    status: e.status === 'published' ? 'registration_open' : e.status,
    organizerId: e.organizer_id || '',
    slug: e.slug,
  };
}

export function HomePage() {
  const [allEvents, setAllEvents] = useState<Event[]>(mockEvents);

  useEffect(() => {
    supabase
      .from('events')
      .select('*, registrations(count)')
      .eq('status', 'published')
      .in('registrations.status', ['paid', 'confirmed', 'presente'])
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllEvents(data.map(supabaseToEvent));
        }
      });
  }, []);

  const events = allEvents;

  // Eventos em destaque (Premium)
  const premiumEvents = events.filter(e => e.plan === 'premium' && e.status === 'registration_open');

  // Próximos eventos
  const upcomingEvents = events
    .filter(e => e.status === 'registration_open')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);

  // Eventos por cidade (Região dos Lagos)
  const eventsByCity = LAGOS_REGION_CITIES.map(city => {
    const cityEvents = events.filter(e => e.city === city && e.status === 'registration_open');
    return { city, events: cityEvents, count: cityEvents.length };
  }).filter(c => c.count > 0);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Seção de Eventos em Destaque */}
      {premiumEvents.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-full mb-4">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <span className="font-semibold">DESTAQUE PREMIUM</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Eventos Premium</h2>
                <p className="text-gray-600 mt-2">Eventos com destaque especial na plataforma</p>
              </div>
              <Link 
                to="/eventos?plano=premium" 
                className="flex items-center gap-2 text-[#C9A84C] hover:text-[#B8962E] font-semibold"
              >
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumEvents.slice(0, 3).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seção de Próximos Eventos */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full mb-4">
                <Calendar className="w-4 h-4" />
                <span className="font-semibold">PRÓXIMOS</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Próximos Eventos</h2>
              <p className="text-gray-600 mt-2">Inscrições abertas - Garanta sua vaga!</p>
            </div>
            <Link 
              to="/calendario" 
              className="flex items-center gap-2 text-[#C9A84C] hover:text-[#B8962E] font-semibold"
            >
              Ver calendário
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Seção de Eventos por Região */}
      {eventsByCity.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-full mb-4">
                <MapPin className="w-4 h-4" />
                <span className="font-semibold">REGIAO DOS LAGOS</span>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Eventos por Cidade</h2>
              <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
                Encontre eventos esportivos em toda a Região dos Lagos - RJ
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {eventsByCity.map(({ city, events: cityEvents }) => (
                <div key={city} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img 
                      src={cityEvents[0].banner || '/images/hero-bg.jpg'} 
                      alt={city}
                      className="w-full h-32 object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-bold text-white">{city}</h3>
                      <p className="text-sm text-gray-200">{cityEvents.length} evento(s)</p>
                    </div>
                  </div>
                  <div className="p-4">
                    {cityEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="mb-3 last:mb-0">
                        <Link 
                          to={`/evento/${event.slug}`}
                          className="flex items-center justify-between text-sm hover:text-[#C9A84C] transition-colors"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{event.name}</p>
                            <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                        </Link>
                      </div>
                    ))}
                    {cityEvents.length > 2 && (
                      <Link 
                        to={`/eventos?cidade=${encodeURIComponent(city)}`}
                        className="text-sm text-[#C9A84C] hover:text-[#B8962E] font-medium mt-2 inline-block"
                      >
                        +{cityEvents.length - 2} mais
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Seção de Diferenciais */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">DIFERENCIAIS</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Por que escolher a 022 RUNNER?</h2>
            <p className="text-gray-600 mt-2 max-w-2xl mx-auto">
              A plataforma mais completa para eventos esportivos da Região dos Lagos
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Assistente IA */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-amber-200 text-center">
              <div className="w-16 h-16 bg-[#C9A84C] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Assistente IA</h3>
              <p className="text-gray-600 text-sm mb-4">
                Nosso assistente de IA analisa automaticamente a qualidade do seu evento e sugere melhorias para aumentar as inscrições.
              </p>
              <span className="inline-block bg-[#C9A84C] text-white px-3 py-1 rounded-full text-xs font-semibold">
                NOVO
              </span>
            </div>

            {/* Landing Page Automática */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 text-center">
              <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Award className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Landing Page</h3>
              <p className="text-gray-600 text-sm mb-4">
                Cada evento ganha uma página personalizada com URL amigável para divulgação nas redes sociais.
              </p>
              <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                INCLUSO
              </span>
            </div>

            {/* Marketing Automático */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200 text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Marketing</h3>
              <p className="text-gray-600 text-sm mb-4">
                Gere automaticamente textos para Instagram, Facebook, WhatsApp e Email com base nos dados do evento.
              </p>
              <span className="inline-block bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                AUTOMÁTICO
              </span>
            </div>

            {/* Score de Qualidade */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200 text-center">
              <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white fill-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Score de Qualidade</h3>
              <p className="text-gray-600 text-sm mb-4">
                Cada evento recebe uma nota de 0 a 100 com base em itens essenciais como fotos, regulamento, kit, etc.
              </p>
              <span className="inline-block bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                92/100
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Seção de Planos */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-full mb-4">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">PLANOS</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Escolha o melhor plano para seu evento</h2>
            <p className="text-gray-600 mt-2">Taxa da plataforma: 0,1 (10%) sobre o valor da inscrição</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plano Gratuito */}
            <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200 text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Gratuito</h3>
                <p className="text-gray-500 mt-2">Publicação básica</p>
              </div>
              <ul className="space-y-4 text-left mb-8">
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Publicação do evento</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Busca normal</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Acesso ao Assistente IA</span>
                </li>
              </ul>
              <button className="w-full bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors">
                Publicar Evento
              </button>
            </div>

            {/* Plano Destaque */}
            <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-[#C9A84C] text-center relative">
              <span className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-[#C9A84C] text-white px-4 py-1 rounded-full text-sm font-semibold">
                POPULAR
              </span>
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-[#C9A84C]">Destaque</h3>
                <p className="text-gray-500 mt-2">Prioridade nas buscas</p>
              </div>
              <ul className="space-y-4 text-left mb-8">
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Tudo do Gratuito</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Prioridade nas buscas</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Selo Destaque</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-700">Destaque por categoria</span>
                </li>
              </ul>
              <button className="w-full bg-[#C9A84C] text-white font-semibold py-3 rounded-lg hover:bg-[#B8962E] transition-colors">
                Assinar Destaque
              </button>
            </div>

            {/* Plano Premium */}
            <div className="bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-xl shadow-xl p-8 text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Premium</h3>
                <p className="text-gray-700 mt-2">Máximo destaque</p>
              </div>
              <ul className="space-y-4 text-left mb-8">
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-800">Tudo do Destaque</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-800">Banner na página inicial</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-800">Destaque regional</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-800">Destaque por cidade</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs">✓</span>
                  </span>
                  <span className="text-gray-800">Divulgação regional</span>
                </li>
              </ul>
              <button className="w-full bg-yellow-700 text-white font-semibold py-3 rounded-lg hover:bg-yellow-800 transition-colors">
                Assinar Premium
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mapa de Eventos */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-full mb-4">
              <MapPin className="w-4 h-4" />
              <span className="font-semibold">EVENTOS NO MAPA</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Eventos na Região dos Lagos</h2>
          </div>
          <div className="rounded-2xl overflow-hidden border shadow-md" style={{ height: '400px' }}>
            <MapContainer center={[-22.8, -42.0]} zoom={10} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {allEvents
                .filter(e => CITY_COORDS[e.city])
                .map(e => {
                  const coords = CITY_COORDS[e.city];
                  return (
                    <Marker key={e.id} position={coords} icon={blueIcon}>
                      <Popup>
                        <div style={{ minWidth: 160 }}>
                          <p style={{ fontWeight: 700, marginBottom: 4 }}>{e.name}</p>
                          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>{new Date(e.date).toLocaleDateString('pt-BR')} · {e.city}</p>
                          <a href={`/evento/${e.slug}`} style={{ color: '#C9A84C', fontSize: 12, fontWeight: 600 }}>Ver evento →</a>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#C9A84C] text-white px-4 py-2 rounded-full mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="font-semibold">PARA ORGANIZADORES</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Como publicar seu evento</h2>
            <p className="text-gray-600 mt-2 max-w-xl mx-auto">Em 3 passos simples seu evento está no ar</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Crie sua conta', desc: 'Cadastre-se como organizador gratuitamente em menos de 2 minutos.' },
              { step: '02', title: 'Configure o evento', desc: 'Preencha dados, distâncias, preços e fotos. O sistema gera a landing page automaticamente.' },
              { step: '03', title: 'Publique e divulgue', desc: 'Compartilhe o link do evento nas redes sociais e comece a receber inscrições.' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white" style={{ backgroundColor: '#000' }}>
                  <span style={{ color: '#C9A84C' }}>{item.step}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/cadastro" className="inline-flex items-center gap-2 bg-[#C9A84C] text-white font-semibold px-8 py-4 rounded-xl hover:bg-[#B8962E] transition-colors">
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Parceiros */}
      <section className="py-12 bg-black">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-semibold tracking-widest mb-6" style={{ color: '#C9A84C' }}>PARCEIROS OFICIAIS</p>
          <p className="text-gray-400 text-sm">Em breve — parceiros oficiais da plataforma serão anunciados aqui.</p>
        </div>
      </section>

      <NewsletterForm />

      {/* CTA Final */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-to-r from-[#C9A84C] to-blue-800 rounded-2xl p-12 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
              Atletas e organizadores da Região dos Lagos já estão usando a plataforma. Faça parte você também!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/cadastro" 
                className="inline-flex items-center justify-center gap-2 bg-white text-[#C9A84C] font-semibold px-8 py-4 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cadastre-se Grátis
              </Link>
              <Link 
                to="/eventos" 
                className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 hover:border-white text-white font-semibold px-8 py-4 rounded-xl transition-colors"
              >
                Ver Eventos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
