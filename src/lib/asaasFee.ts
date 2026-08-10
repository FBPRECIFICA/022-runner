export type AsaasPaymentMethod = 'PIX' | 'CREDIT_CARD' | 'BOLETO' | string | null | undefined;

export function paymentMethodLabel(method: AsaasPaymentMethod): string {
  if (method === 'PIX') return 'PIX';
  if (method === 'CREDIT_CARD') return 'Cartão';
  if (method === 'BOLETO') return 'Boleto';
  return '-';
}

// Nunca estimar a taxa Asaas por fórmula: testado em ago/2026 contra dados reais (Balneário Run +
// Arena MMP) e as taxas de mercado informadas (PIX 1,99%+R$0,99 | Cartão R$3,45+R$0,99) não bateram
// com o netValue real devolvido pela API do Asaas. A fonte da verdade é sempre `asaas_net_value`,
// gravado no momento da confirmação do pagamento (webhook) a partir do campo `netValue` do Asaas.

export function asaasFeeFromNetValue(amountCharged: number, netValue: number | null | undefined): number | null {
  if (netValue == null) return null;
  return Math.round((amountCharged - Number(netValue)) * 100) / 100;
}

// base_amount é o que o organizador tem direito a receber (a comissão de 10% é cobrada à parte, do
// atleta, em cima do base_amount). netValue já reflete o valor cobrado (base+comissão) menos a taxa
// real do Asaas — por isso subtrai de volta a comissão da plataforma, que não é do organizador.
export function netForOrganizer(platformFee: number, netValue: number | null | undefined): number | null {
  if (netValue == null) return null;
  return Number(netValue) - Number(platformFee);
}
