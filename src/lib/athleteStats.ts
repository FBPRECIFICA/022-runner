interface AthleteStatsRow {
  id: string;
  gender?: string | null;
  birth_date?: string | null;
  status?: string;
  created_at?: string;
}

const GENDER_LABELS: Record<string, string> = { M: 'Masculino', F: 'Feminino', O: 'Outro' };
const GENDER_COLORS: Record<string, string> = { M: '#3B82F6', F: '#EC4899', O: '#9CA3AF' };

function calcAge(birthDate: string): number {
  const today = new Date();
  const [y, m, d] = birthDate.split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}

export function computeAthleteStats<T extends AthleteStatsRow>(regs: T[]) {
  const confirmed = regs.filter(r => r.status === 'paid' || r.status === 'confirmed');
  const pending = regs.filter(r => r.status === 'pending' || r.status === 'awaiting_payment');

  const genderCounts = regs.reduce((acc: Record<string, number>, r) => {
    if (r.gender) acc[r.gender] = (acc[r.gender] || 0) + 1;
    return acc;
  }, {});
  const genderData = Object.entries(genderCounts).map(([g, count]) => ({
    name: GENDER_LABELS[g] || g,
    value: count,
    color: GENDER_COLORS[g] || '#C9A84C',
  }));

  const ages = regs
    .filter(r => r.birth_date)
    .map(r => calcAge(r.birth_date as string))
    .filter(age => age > 0 && age <= 110); // descarta data de nascimento invalida/digitada errado
  const avgAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null;
  const minAge = ages.length ? Math.min(...ages) : null;
  const maxAge = ages.length ? Math.max(...ages) : null;

  const lastRegs = [...regs].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ).slice(0, 10);

  return { confirmed, pending, genderData, avgAge, minAge, maxAge, lastRegs };
}
