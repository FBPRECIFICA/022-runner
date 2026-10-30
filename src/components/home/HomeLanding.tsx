import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Award, Megaphone, Gauge } from 'lucide-react';
import { NewsletterForm } from '../NewsletterForm';
import { PartnersSection } from '../PartnersSection';
import { events as mockEvents, LAGOS_REGION_CITIES } from '../../data/mockData';
import { formatDate } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { supabaseToEvent } from '../../utils/eventMapper';
import type { Event } from '../../types';
import { HomeHero } from './HomeHero';
import { HomeEventCard } from './HomeEventCard';
import { HomeEventMap } from './HomeEventMap';
import { HomeSecuritySeal } from './HomeSecuritySeal';
import { CountUp } from './CountUp';
import { useReveal } from './useInView';
import { REGISTERED_USERS_COUNT } from './homeFlags';
import './home.css';

// Home nova (NEW_FRONT_ENABLED). Mesmos dados, mesma busca e mesmos textos da
// HomePageClassic — muda só aparência e movimento.

function SectionHead({ label, title, text, link, center }: {
  label: string; title: string; text?: string; link?: ReactNode; center?: boolean;
}) {
  return (
    <div data-reveal className={`mb-10 ${center ? 'text-center' : 'flex items-end justify-between gap-6'}`}>
      <div className={center ? 'max-w-2xl mx-auto' : ''}>
        <p className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#C9A84C] mb-3 ${center ? 'justify-center' : ''}`}>
          <span className="w-8 h-[2px] bg-[#C9A84C]" />{label}
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">{title}</h2>
        {text && <p className="text-gray-600 mt-2">{text}</p>}
      </div>
      {link}
    </div>
  );
}

const stagger = (i: number) => ({ ['--d' as string]: `${Math.min(i, 5) * 0.08}s` });
const linkCls = 'flex items-center gap-2 text-[#C9A84C] hover:text-[#B8962E] font-semibold whitespace-nowrap';

export function HomeLanding() {
  const [allEvents, setAllEvents] = useState<Event[]>(mockEvents);
  const [confirmedTotal, setConfirmedTotal] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Mesma consulta da HomePageClassic (somente leitura).
  useEffect(() => {
    Promise.all([
      supabase.from('events').select('*, registration_types(price)').eq('status', 'published').order('date', { ascending: true }),
      supabase.rpc('get_events_confirmed_counts'),
    ]).then(([{ data }, { data: counts }]) => {
      if (data && data.length > 0) {
        const countByEvent = new Map<string, number>((counts || []).map((c: any) => [c.event_id, c.confirmed_count]));
        setAllEvents(data.map(e => supabaseToEvent(e, countByEvent.get(e.id) ?? 0)));
        setConfirmedTotal(data.reduce((s, e) => s + (countByEvent.get(e.id) ?? 0), 0));
        setLoaded(true);
      }
    });
  }, []);

  useReveal(rootRef, allEvents);

  const events = allEvents;
  const premiumEvents = events.filter(e => e.plan === 'premium' && e.status === 'registration_open');
  const upcomingEvents = events
    .filter(e => e.status === 'registration_open')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 6);
  const eventsByCity = LAGOS_REGION_CITIES.map(city => {
    const cityEvents = events.filter(e => e.city === city && e.status === 'registration_open');
    return { city, events: cityEvents, count: cityEvents.length };
  }).filter(c => c.count > 0);

  const stats = loaded ? [
    { value: allEvents.length, label: allEvents.length === 1 ? 'evento na plataforma' : 'eventos na plataforma' },
    ...(confirmedTotal !== null ? [{ value: confirmedTotal, label: 'inscrições confirmadas' }] : []),
    ...(REGISTERED_USERS_COUNT !== null ? [{ value: REGISTERED_USERS_COUNT, label: 'cadastros' }] : []),
  ] : [];

  return (
    <div ref={rootRef} className="min-h-screen">
      <HomeHero />

      {/* Números reais */}
      {stats.length > 0 && (
        <section className="bg-black text-white border-t-[3px] border-[#C9A84C]">
          <div className={`container mx-auto px-4 py-10 grid gap-8 ${stats.length === 3 ? 'sm:grid-cols-3' : 'grid-cols-2'}`}>
            {stats.map((s, i) => (
              <div key={s.label} data-reveal style={stagger(i)} className="text-center sm:text-left">
                <div className="text-4xl md:text-6xl font-extrabold tracking-tight text-[#C9A84C] leading-none">
                  <CountUp value={s.value} />
                </div>
                <p className="mt-2 text-xs md:text-sm font-semibold uppercase tracking-[0.15em] text-gray-300">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {premiumEvents.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <SectionHead
              label="Destaque Premium"
              title="Eventos Premium"
              text="Eventos com destaque especial na plataforma"
              link={<Link to="/eventos?plano=premium" className={linkCls}>Ver todos <ArrowRight className="w-4 h-4" /></Link>}
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {premiumEvents.slice(0, 3).map((event, i) => (
                <div key={event.id} data-reveal style={stagger(i)}><HomeEventCard event={event} /></div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="container mx-auto px-4">
          <SectionHead
            label="Próximos"
            title="Próximos Eventos"
            text="Inscrições abertas - Garanta sua vaga!"
            link={<Link to="/calendario" className={linkCls}>Ver calendário <ArrowRight className="w-4 h-4" /></Link>}
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event, i) => (
              <div key={event.id} data-reveal style={stagger(i)}><HomeEventCard event={event} /></div>
            ))}
          </div>
        </div>
      </section>

      {eventsByCity.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <SectionHead center label="Região dos Lagos" title="Eventos por Cidade" text="Encontre eventos esportivos em toda a Região dos Lagos - RJ" />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {eventsByCity.map(({ city, events: cityEvents }, i) => (
                <div key={city} data-reveal style={stagger(i)} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-baseline justify-between gap-2">
                    <h3 className="text-lg font-extrabold tracking-tight text-gray-900">{city}</h3>
                    <p className="text-xs font-semibold text-gray-500 tabular-nums">{cityEvents.length} evento(s)</p>
                  </div>
                  <div className="p-4">
                    {cityEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="mb-3 last:mb-0">
                        <Link to={`/evento/${event.slug}`} className="group flex items-center gap-3 text-sm">
                          <img src={event.banner || '/images/hero-bg.jpg'} alt={event.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate group-hover:text-[#C9A84C] transition-colors">{event.name}</p>
                            <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                        </Link>
                      </div>
                    ))}
                    {cityEvents.length > 2 && (
                      <Link to={`/eventos?cidade=${encodeURIComponent(city)}`} className="text-sm text-[#C9A84C] hover:text-[#B8962E] font-semibold mt-2 inline-block">
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

      {/* Diferenciais — mesmos textos; sem gradientes coloridos nem caixinha de ícone */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <SectionHead center label="Diferenciais" title="Por que escolher a 022 RUNNER?" text="A plataforma mais completa para eventos esportivos da Região dos Lagos" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
            {[
              { icon: Sparkles, title: 'Assistente IA', text: 'Nosso assistente de IA analisa automaticamente a qualidade do seu evento e sugere melhorias para aumentar as inscrições.', tag: 'NOVO' },
              { icon: Award, title: 'Landing Page', text: 'Cada evento ganha uma página personalizada com URL amigável para divulgação nas redes sociais.', tag: 'INCLUSO' },
              { icon: Megaphone, title: 'Marketing', text: 'Gere automaticamente textos para Instagram, Facebook, WhatsApp e Email com base nos dados do evento.', tag: 'AUTOMÁTICO' },
              { icon: Gauge, title: 'Score de Qualidade', text: 'Cada evento recebe uma nota de 0 a 100 com base em itens essenciais como fotos, regulamento, kit, etc.', tag: '92/100' },
            ].map(({ icon: Icon, title, text, tag }, i) => (
              <div key={title} data-reveal style={stagger(i)} className="bg-white p-6">
                <div className="flex items-center justify-between mb-5">
                  <Icon className="w-7 h-7 text-[#C9A84C]" strokeWidth={1.5} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{tag}</span>
                </div>
                <h3 className="text-lg font-extrabold tracking-tight text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <SectionHead center label="Eventos no Mapa" title="Eventos na Região dos Lagos" />
          <div data-reveal><HomeEventMap events={allEvents} /></div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <SectionHead center label="Para Organizadores" title="Como publicar seu evento" text="Em 3 passos simples seu evento está no ar" />
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Crie sua conta', desc: 'Cadastre-se como organizador gratuitamente em menos de 2 minutos.' },
              { step: '02', title: 'Configure o evento', desc: 'Preencha dados, distâncias, preços e fotos. O sistema gera a landing page automaticamente.' },
              { step: '03', title: 'Publique e divulgue', desc: 'Compartilhe o link do evento nas redes sociais e comece a receber inscrições.' },
            ].map((item, i) => (
              <div key={item.step} data-reveal style={stagger(i)} className="border-t-2 border-black pt-5">
                <span className="block text-4xl font-extrabold tracking-tight text-[#C9A84C] tabular-nums mb-3">{item.step}</span>
                <h3 className="text-xl font-extrabold tracking-tight text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div data-reveal className="text-center mt-10">
            <Link to="/cadastro" className="hh-btn inline-flex items-center gap-2 bg-[#C9A84C] text-white font-semibold px-8 py-4 rounded-xl hover:bg-[#B8962E] transition-colors">
              Criar conta grátis <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-10 bg-white">
        <div data-reveal className="container mx-auto px-4">
          <HomeSecuritySeal />
        </div>
      </section>

      <PartnersSection />

      <NewsletterForm />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div data-reveal className="bg-black rounded-2xl p-8 md:p-12 text-white text-center border-t-[3px] border-[#C9A84C]">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">Pronto para começar?</h2>
            <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Atletas e organizadores da Região dos Lagos já estão usando a plataforma. Faça parte você também!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/cadastro" className="hh-btn inline-flex items-center justify-center gap-2 bg-[#C9A84C] text-white font-semibold px-8 py-4 rounded-xl hover:bg-[#B8962E] transition-colors">
                Cadastre-se Grátis
              </Link>
              <Link to="/eventos" className="hh-btn inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/30 hover:border-white text-white font-semibold px-8 py-4 rounded-xl transition-colors">
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
