import type { Event } from '../types';
import { isRegistrationOpen } from './registrationStatus';

// Antes duplicada em HomePage.tsx, SearchPage.tsx e EventsPage.tsx — consolidada
// aqui pra não ter três lugares pra manter sincronizados quando a lógica de
// "inscrições abertas" muda (era exatamente esse tipo de duplicidade que o
// BLOCO Corrida Solidária (R2) pediu pra eliminar).
// confirmedCount vem de fora (RPC get_events_confirmed_counts) — `registrations`
// não é visível via embed pra visitante anônimo (não tem policy de SELECT pra anon,
// só tem confirmedCount real quando alguém chama a RPC security definer).
export function supabaseToEvent(e: any, confirmedCount = 0): Event {
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
    currentParticipants: confirmedCount,
    banner: e.banner_url || '',
    distances,
    registrationTypes: (e.registration_types || []).map((t: any) => ({ price: Number(t.price) })),
    qualityScore: e.quality_score || 0,
    plan: e.plan || 'free',
    status: isRegistrationOpen(e, confirmedCount) ? 'registration_open' : 'registration_closed',
    organizerId: e.organizer_id || '',
    slug: e.slug,
  };
}
