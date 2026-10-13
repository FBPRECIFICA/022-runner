// Data de nascimento obrigatória e real em todo caminho de inscrição. Motivo: o
// Balneário Run teve 8 inscrições pagas sem data — o form só checava "não vazio",
// "15/09/19" (ano com 2 dígitos) virava null no birthdateToISO e o insert gravava
// `birth_date: null` sem avisar. Mesma regra no servidor: supabase/functions/_shared/birthdate.ts
// e trigger registrations_require_birth_date.

export interface BirthdateValidation {
  ok: boolean;
  iso?: string;
  error?: string;
}

export const BIRTHDATE_INCOMPLETE = 'Informe a data completa: dia/mês/ano com 4 dígitos (ex.: 15/09/1985).';
export const BIRTHDATE_INVALID = 'Data de nascimento inválida.';
export const BIRTHDATE_FUTURE = 'A data não pode ser futura.';

// `today` só existe pros testes; o padrão é a data local de agora.
export function validateBirthdate(raw: string | null | undefined, today: Date = new Date()): BirthdateValidation {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((raw ?? '').trim());
  if (!m) return { ok: false, error: BIRTHDATE_INCOMPLETE };
  const [, dd, mm, yyyy] = m;
  const day = Number(dd), month = Number(mm), year = Number(yyyy);
  // Date "rola" 31/02 pra 03/03 — se não volta igual, o dia não existe (cobre bissexto).
  const d = new Date(year, month - 1, day);
  if (year < 1900 || d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return { ok: false, error: BIRTHDATE_INVALID };
  }
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (d > todayMidnight) return { ok: false, error: BIRTHDATE_FUTURE };
  return { ok: true, iso: `${yyyy}-${mm}-${dd}` };
}

// <input type="date"> (painel do organizador) entrega AAAA-MM-DD.
export function validateBirthdateISO(iso: string | null | undefined, today?: Date): BirthdateValidation {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? '').trim());
  return validateBirthdate(m ? `${m[3]}/${m[2]}/${m[1]}` : '', today);
}
