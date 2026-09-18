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
  if (isSoldOut(event, confirmedCount)) return false;
  return true;
}

// Distingue "esgotado por lotação" (max_participants atingido) dos outros motivos de
// inscrição encerrada (toggle manual, evento não publicado) — usado só pra decidir o
// texto exibido ("Esgotado" vs "Inscrições Encerradas"), nunca pra liberar inscrição.
export function isSoldOut(
  event: { max_participants?: number | null },
  confirmedCount = 0
): boolean {
  const maxP = event.max_participants || 0;
  return maxP > 0 && confirmedCount >= maxP;
}
