// Checagem de formato no servidor (backstop). A validação completa, com
// sugestão de provedor (gmai.com → gmail.com), fica no front em
// src/lib/emailValidation.ts — aqui só barra o que com certeza não entrega.
// ponytail: cópia mínima das regras do front; mover pra um só arquivo se elas divergirem.
const BAD_TLDS = ['c', 'con', 'comc', 'co', 'cm', 'vom', 'om', 'coml']

export function normalizeEmail(raw: unknown): string {
  return String(raw ?? '').trim().toLowerCase()
}

export function isEmailFormatValid(raw: unknown): boolean {
  const email = normalizeEmail(raw)
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) || email.includes('..')) return false
  return !BAD_TLDS.includes(email.split('.').pop()!)
}
