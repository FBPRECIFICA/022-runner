// Validação de e-mail usada em todos os pontos de entrada (inscrição, cadastro,
// perfil, newsletter). Motivo: em 09/10/2026 a Patricia digitou
// "prcorado@hotmail.c", o type="email" do navegador aceitou, o Asaas recusou
// o cliente (invalid_email) e ela tentou 11 vezes em 45 min vendo só
// "Edge Function returned a non-2xx status code". Erros de digitação em
// provedor conhecido (gmai.com, hotmail.con, gmail.comc) agora são bloqueados
// com sugestão; domínio de empresa fora da lista passa se o formato estiver certo.

export interface EmailValidation {
  ok: boolean;
  normalized: string;
  error?: string;
  suggestion?: string;
}

const KNOWN_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com',
  'live.com', 'bol.com.br', 'uol.com.br', 'msn.com', 'ymail.com', 'terra.com.br',
  'globo.com', 'hotmail.com.br', 'outlook.com.br', 'proton.me',
];

// Provedores reais que ficam a distância ≤ 2 de algum da lista acima
// (ex: mail.com ↔ gmail.com, me.com ↔ msn.com) — sem isso seriam bloqueados.
const LEGIT_NEAR_DOMAINS = ['mail.com', 'email.com', 'me.com', 'mac.com', 'aol.com', 'gmx.com', 'ig.com.br', 'zoho.com'];

// ponytail: bloqueia esses TLDs em qualquer domínio, inclusive .co legítimo (Colômbia) — raro no público da plataforma.
const BAD_TLDS = ['c', 'con', 'comc', 'co', 'cm', 'vom', 'om', 'coml'];

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

// Domínio que a pessoa provavelmente quis digitar, ou null se não há correção a sugerir.
function suggestDomain(domain: string): string | null {
  let candidate = domain;
  if (!domain.includes('.')) {
    const known = KNOWN_DOMAINS.find(d => d.replace(/\./g, '') === domain || d.split('.')[0] === domain);
    if (known) return known;
    if (domain.endsWith('com')) candidate = domain.slice(0, -3) + '.com';
    else return null;
  }
  const parts = candidate.split('.');
  const tld = parts[parts.length - 1];
  if (BAD_TLDS.includes(tld) || !/^[a-z]{2,}$/.test(tld)) {
    candidate = [...parts.slice(0, -1), 'com'].join('.');
  }
  if (KNOWN_DOMAINS.includes(candidate) || LEGIT_NEAR_DOMAINS.includes(candidate)) {
    return candidate === domain ? null : candidate;
  }
  let best: string | null = null;
  let bestDist = 3;
  for (const d of KNOWN_DOMAINS) {
    const dist = editDistance(candidate, d);
    if (dist < bestDist) { best = d; bestDist = dist; }
  }
  if (best) return best;
  return candidate === domain ? null : candidate;
}

export function validateEmail(raw: string): EmailValidation {
  const normalized = (raw ?? '').trim().toLowerCase();
  const fail = (error: string, suggestion?: string): EmailValidation => ({ ok: false, normalized, error, suggestion });

  if (!normalized) return fail('Informe seu e-mail.');
  if (/\s/.test(normalized)) return fail('O e-mail não pode ter espaços.');
  const at = normalized.split('@').length - 1;
  if (at === 0) return fail('O e-mail precisa ter @.');
  if (at > 1) return fail('O e-mail tem mais de um @.');
  const [local, domain] = normalized.split('@');
  if (!local) return fail('Falta a parte antes do @.');
  if (!domain) return fail('Falta o domínio depois do @ (ex: gmail.com).');
  if (normalized.endsWith('.')) return fail('O e-mail não pode terminar com ponto.');
  if (normalized.includes('..')) return fail('O e-mail não pode ter dois pontos seguidos.');

  const suggestedDomain = suggestDomain(domain);
  const suggestion = suggestedDomain ? `${local}@${suggestedDomain}` : undefined;
  const didYouMean = suggestion ? ` Você quis dizer ${suggestion}?` : '';

  if (!domain.includes('.')) return fail(`Domínio incompleto: "${domain}".${didYouMean}`, suggestion);
  const tld = domain.split('.').pop()!;
  if (!/^[a-z]{2,}$/.test(tld) || BAD_TLDS.includes(tld)) {
    return fail(`Final do e-mail inválido: ".${tld}".${didYouMean}`, suggestion);
  }
  if (suggestion) return fail(`Confira o e-mail.${didYouMean}`, suggestion);
  return { ok: true, normalized };
}
