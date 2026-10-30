// "Faltam X" até a largada. null quando a data já passou (não mostra nada).
export function countdownLabel(date: Date | string, now: number = Date.now()): string | null {
  const ms = new Date(date).getTime() - now;
  if (!(ms > 0)) return null;
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  if (d >= 1) return `Faltam ${d} ${d === 1 ? 'dia' : 'dias'} e ${h}h`;
  return `Faltam ${h}h ${String(min % 60).padStart(2, '0')}min`;
}

// Vagas restantes só quando o evento tem limite cadastrado; senão null (mantém
// o texto genérico "Vagas limitadas" ou nada, como antes).
export function spotsLeftLabel(max: number, taken: number): string | null {
  if (!(max > 0)) return null;
  const left = max - taken;
  if (left <= 0) return null;
  return left === 1 ? 'Resta 1 vaga' : `Restam ${left} vagas`;
}
