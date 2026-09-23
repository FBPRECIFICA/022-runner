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

export interface AuditFigures {
  bruto: number;
  comissao: number;
  taxaAsaas: number;
  liquido: number;
}

type AuditableRow = {
  status?: string | null;
  amount?: number | null;
  base_amount?: number | null;
  platform_fee?: number | null;
  asaas_net_value?: number | null;
  asaas_anticipation_fee?: number | null;
  refunded_amount?: number | null;
};

// Linhas que entram na conta de dinheiro: pagas/confirmadas E estornadas (status 'cancelled' com
// refunded_amount > 0). Uma inscrição estornada não é mais inscrito, mas as taxas Asaas da
// transação original não voltam — sem ela aqui, o líquido do organizador fica maior que o real.
// Para CONTAR inscritos, continue filtrando só por status paid/confirmed.
export function isFinancialRow(r: AuditableRow): boolean {
  return r.status === 'paid' || r.status === 'confirmed' || Number(r.refunded_amount ?? 0) > 0;
}

// Os "4 números" de auditoria — fonte única usada em painel Organizador, painel Admin e no PDF
// de Auditoria, pra nunca mais divergir entre telas. Bruto = amount (total pago pelo atleta, já
// com a comissão embutida) menos estornos devolvidos — não base_amount, ver CLAUDE.md "Nota sobre
// Bruto". Taxa Asaas = PAYMENT_FEE (via netValue) + mensageria + antecipação de recebíveis
// (`asaas_anticipation_fee`, só existe no extrato Asaas — nunca entra no netValue). Os 4 sempre
// reconciliam por construção: Bruto − Comissão − TaxaAsaas = Líquido.
export function auditFigures(r: AuditableRow): AuditFigures {
  const estorno = Number(r.refunded_amount ?? 0);
  const bruto = Number(r.amount ?? r.base_amount ?? 0) - estorno;
  const comissao = Number(r.platform_fee ?? 0);
  const antecipacao = Number(r.asaas_anticipation_fee ?? 0);
  const taxaAsaas = (asaasFeeFromNetValue(Number(r.amount ?? r.base_amount ?? 0), r.asaas_net_value) ?? 0) + antecipacao;
  const liquido = (netForOrganizer(comissao, r.asaas_net_value) ?? (bruto + estorno - comissao)) - antecipacao - estorno;
  return { bruto, comissao, taxaAsaas, liquido };
}

// Soma só as linhas financeiras (isFinancialRow) — pode passar a lista inteira do evento.
export function sumAuditFigures(regs: AuditableRow[]): AuditFigures {
  return regs.filter(isFinancialRow).reduce((acc, r) => {
    const f = auditFigures(r);
    return {
      bruto: acc.bruto + f.bruto,
      comissao: acc.comissao + f.comissao,
      taxaAsaas: acc.taxaAsaas + f.taxaAsaas,
      liquido: acc.liquido + f.liquido,
    };
  }, { bruto: 0, comissao: 0, taxaAsaas: 0, liquido: 0 });
}

// Taxa da plataforma: sempre 10% do valor ORIGINAL da inscrição (base_amount +
// discount_amount, isto é, antes do cupom), nunca do total pós-desconto. Regra
// vigente desde 11/08/2026 (ver "fixed_commission_original_price"). Duplicada
// em dois lugares de AdminDashboard.tsx antes de virar essa função única.
export function platformFeeFromOriginal(baseAmount: number | null | undefined, discountAmount: number | null | undefined): number {
  return Math.round((Number(baseAmount ?? 0) + Number(discountAmount ?? 0)) * 0.10 * 100) / 100;
}
