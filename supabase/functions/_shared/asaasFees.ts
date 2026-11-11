// Taxas REAIS cobradas pelo Asaas em cada cobrança, a partir do extrato (GET /financialTransactions).
// Módulo puro (sem fetch), usado pela Edge Function sync-asaas-fees e testado em
// src/__tests__/asaasFees.test.ts.
//
// Como o Asaas lança cada coisa (conferido no extrato real em 11/11/2026):
// - Pix: PAYMENT_RECEIVED (+valor), PAYMENT_FEE (tarifa R$ 1,99) e
//   PAYMENT_MESSAGING_NOTIFICATION_FEE (R$ 0,99), todos com paymentId.
// - Cartão antecipado: RECEIVABLE_ANTICIPATION_GROSS_CREDIT (+valor) e RECEIVABLE_ANTICIPATION_FEE
//   (taxa de antecipação) SEM paymentId — ligados só pelo "fatura nr. <invoiceNumber>" da descrição;
//   PAYMENT_FEE (tarifa %) com paymentId. Na data do crédito (~30 dias) entram PAYMENT_RECEIVED,
//   RECEIVABLE_ANTICIPATION_DEBIT (baixa da antecipação, anula o crédito antecipado) e só então a
//   mensageria de R$ 0,99.
// - WhatsApp: INSTANT_TEXT_MESSAGE_FEE (R$ 0,55) sem paymentId, "cobrança <invoiceNumber>".
// - Chargeback: CHARGEBACK / CHARGEBACK_REVERSAL / PAYMENT_FEE_REVERSAL com paymentId.
// Somar TODOS os lançamentos ligados a uma cobrança dá exatamente o dinheiro que ela deixou no Asaas.

export interface AsaasTx {
  type: string
  value: number
  date: string
  description?: string | null
  paymentId?: string | null
}

export interface FeeBreakdown {
  payment_fee: number       // tarifa do meio de pagamento (Pix/cartão), já líquida de estorno de tarifa
  messaging_fee: number     // taxa de mensageria
  anticipation_fee: number  // taxa de antecipação do cartão
  notification_fee: number  // notificação por WhatsApp
  other_fee: number         // custo residual de chargeback/estorno e qualquer outro débito
  real_net: number | null   // dinheiro que a cobrança deixou no Asaas (null = ainda não liquidou)
  settled_at: string | null // primeira entrada de dinheiro (recebimento ou antecipação)
}

const CREDIT_TYPES = new Set(['PAYMENT_RECEIVED', 'RECEIVABLE_ANTICIPATION_GROSS_CREDIT'])
const CATEGORY: Record<string, keyof Omit<FeeBreakdown, 'real_net' | 'settled_at'>> = {
  PAYMENT_FEE: 'payment_fee',
  PAYMENT_FEE_REVERSAL: 'payment_fee',
  PAYMENT_MESSAGING_NOTIFICATION_FEE: 'messaging_fee',
  RECEIVABLE_ANTICIPATION_FEE: 'anticipation_fee',
  INSTANT_TEXT_MESSAGE_FEE: 'notification_fee',
}
// Movimentos de principal (entrada do valor e suas baixas) — não são taxa.
const PRINCIPAL_TYPES = new Set([
  'PAYMENT_RECEIVED', 'RECEIVABLE_ANTICIPATION_GROSS_CREDIT', 'RECEIVABLE_ANTICIPATION_DEBIT',
])

const round2 = (n: number) => Math.round(n * 100) / 100 || 0 // sem -0

// "fatura nr. 964556022" / "cobrança 949609554"
export function invoiceFromDescription(description?: string | null): string | null {
  const m = (description ?? '').match(/(?:fatura nr\.|cobran\S*)\s*(\d+)/i)
  return m ? m[1] : null
}

// Agrupa o extrato por paymentId; lançamentos sem paymentId entram pelo número da fatura.
export function groupByPayment(tx: AsaasTx[], invoiceToPayment: Record<string, string>): Map<string, AsaasTx[]> {
  const out = new Map<string, AsaasTx[]>()
  for (const t of tx) {
    let pid = t.paymentId ?? null
    if (!pid) {
      const inv = invoiceFromDescription(t.description)
      pid = inv ? invoiceToPayment[inv] ?? null : null
    }
    if (!pid) continue
    if (!out.has(pid)) out.set(pid, [])
    out.get(pid)!.push(t)
  }
  return out
}

export function feesFromTransactions(tx: AsaasTx[]): FeeBreakdown {
  const f: FeeBreakdown = {
    payment_fee: 0, messaging_fee: 0, anticipation_fee: 0, notification_fee: 0, other_fee: 0,
    real_net: null, settled_at: null,
  }
  let total = 0
  let principal = 0
  for (const t of tx) {
    const v = Number(t.value)
    total += v
    const cat = CATEGORY[t.type]
    if (cat) f[cat] += -v
    else if (PRINCIPAL_TYPES.has(t.type)) principal += v
    if (CREDIT_TYPES.has(t.type) && (f.settled_at == null || t.date < f.settled_at)) f.settled_at = t.date
  }
  // Tudo que não é principal nem taxa categorizada (chargeback e afins) vira "outros".
  const categorized = f.payment_fee + f.messaging_fee + f.anticipation_fee + f.notification_fee
  f.other_fee = round2(principal - total - categorized)
  f.payment_fee = round2(f.payment_fee)
  f.messaging_fee = round2(f.messaging_fee)
  f.anticipation_fee = round2(f.anticipation_fee)
  f.notification_fee = round2(f.notification_fee)
  if (f.settled_at != null) f.real_net = round2(total)
  return f
}

// Parte das taxas que o "vale Fábio" cobre: tudo além da tarifa do meio de pagamento.
export function coveredFee(f: FeeBreakdown): number {
  return round2(f.messaging_fee + f.anticipation_fee + f.notification_fee + f.other_fee)
}
