const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

export const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
}

export type VoidResult = { ok: true } | { ok: false; message: string; details?: unknown }

// Anula uma cobrança Asaas antes de qualquer alteração que cancele ou troque o
// valor/kit de uma inscrição pendente — sem isso, a cobrança antiga continua
// viva e, se alguém pagar aquele link velho depois, o asaas-webhook reviveria a
// inscrição pra 'paid' com dados desatualizados (mesmo risco do caso Isis/Isa em
// Balneário Run, nunca corrigido até hoje). Idempotente: se a cobrança já não
// existir mais na Asaas (ex: anulada numa tentativa anterior), trata como sucesso.
export async function voidAsaasPayment(paymentId: string): Promise<VoidResult> {
  const statusRes = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, { headers: asaasHeaders })
  if (statusRes.status === 404) {
    return { ok: true }
  }
  const paymentStatus = await statusRes.json()
  if (paymentStatus.status === 'RECEIVED' || paymentStatus.status === 'CONFIRMED') {
    return { ok: false, message: 'Essa cobrança já foi confirmada como paga. Fale com o suporte.' }
  }
  if (paymentStatus.deleted === true) {
    return { ok: true }
  }

  const deleteRes = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: asaasHeaders,
  })
  if (deleteRes.status === 404) {
    return { ok: true }
  }
  const deleteResult = await deleteRes.json()
  if (!deleteResult.deleted) {
    return { ok: false, message: 'Não foi possível anular a cobrança na Asaas.', details: deleteResult }
  }
  return { ok: true }
}
