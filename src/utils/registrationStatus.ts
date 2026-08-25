// Fonte única de verdade pra "inscrições abertas ou encerradas" — usado tanto
// pelas páginas que leem a linha crua do Supabase (EventDetailPage,
// RegistrationPage) quanto pelo mapper usado nas listagens (eventMapper.ts).
// Prioridade: toggle manual do organizador > lotação (vagas confirmadas >= max_participants).
export function isRegistrationOpen(
  event: { status?: string | null; registrations_closed?: boolean | null; max_participants?: number | null },
  confirmedCount = 0
): boolean {
  if (event.status !== 'published') return false;
  if (event.registrations_closed) return false;
  const maxP = event.max_participants || 0;
  if (maxP > 0 && confirmedCount >= maxP) return false;
  return true;
}
