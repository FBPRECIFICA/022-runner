// Backstop no servidor da regra de src/lib/birthdateValidation.ts (data real,
// >= 1900, não futura). Recebe AAAA-MM-DD, que é como o Postgres devolve `date`.
// ponytail: cópia mínima das regras do front; mover pra um só arquivo se divergirem.
export const INVALID_BIRTHDATE_MESSAGE = 'Informe sua data de nascimento (dia/mês/ano com 4 dígitos) para gerar o pagamento.'

export function isBirthdateValid(raw: unknown): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw ?? '').trim())
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (y < 1900 || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return false
  // "Hoje" no horário de Brasília (UTC-3, sem horário de verão desde 2019).
  const todayBrt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return m[0] <= todayBrt
}
