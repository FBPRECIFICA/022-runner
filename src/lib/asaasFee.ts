export type AsaasPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | string | null | undefined;

export function paymentMethodLabel(method: AsaasPaymentMethod): string {
  if (method === 'PIX') return 'PIX';
  if (method === 'CREDIT_CARD') return 'Cartão';
  if (method === 'BOLETO') return 'Boleto';
  return '-';
}

// Nunca estimar a taxa Asaas por fórmula de mercado: testado em ago/2026 e as taxas informadas
// inicialmente (PIX 1,99%+R$0,99 | Cartão R$3,45+R$0,99) não batiam com o `netValue` devolvido por
// GET /payments/{id}. A fonte da verdade é `asaas_net_value`, gravado a partir desse `netValue`.
//
// IMPORTANTE: `netValue` só desconta a PAYMENT_FEE (taxa da transação em si). O Asaas cobra, à parte,
// uma PAYMENT_MESSAGING_NOTIFICATION_FEE (taxa de mensageria/SMS) por transação confirmada, que NÃO
// entra no `netValue` — só aparece no extrato da conta (GET /financialTransactions). Confirmado em
// ago/2026 consultando o extrato de 9 pagamentos reais (6 PIX + 3 Cartão): todos tinham exatamente
// um lançamento PAYMENT_MESSAGING_NOTIFICATION_FEE de R$0,99, vinculado à mesma fatura/paymentId —
// ou seja, é por transação, não uma cobrança mensal agregada.
export const ASAAS_MESSAGING_FEE = 0.99;

export function asaasFeeFromNetValue(amountCharged: number, netValue: number | null | undefined): number | null {
  if (netValue == null) return null;
  return Math.round((amountCharged - Number(netValue) + ASAAS_MESSAGING_FEE) * 100) / 100;
}

// base_amount é o que o organizador tem direito a receber (a comissão de 10% é cobrada à parte, do
// atleta, em cima do base_amount). netValue reflete o valor cobrado (base+comissão) menos a
// PAYMENT_FEE — por isso também desconta a taxa de mensageria (fora do netValue) e a comissão da
// plataforma (que não é do organizador) de volta.
export function netForOrganizer(platformFee: number, netValue: number | null | undefined): number | null {
  if (netValue == null) return null;
  return Number(netValue) - ASAAS_MESSAGING_FEE - Number(platformFee);
}
