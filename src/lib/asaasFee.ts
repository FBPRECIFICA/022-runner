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
  // Taxas reais do extrato Asaas (sync-asaas-fees). asaas_real_net null = ainda não liquidou.
  asaas_payment_fee?: number | null;
  asaas_messaging_fee?: number | null;
  asaas_notification_fee?: number | null;
  asaas_other_fee?: number | null;
  asaas_real_net?: number | null;
  asaas_settled_at?: string | null;
  asaas_fees_synced_at?: string | null;
  // "Vale Fábio": taxa assumida (null = evento sem cobertura) + ajuste repassado ao organizador.
  covered_fee?: number | null;
  covered_adjustment?: number | null;
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
//
// Visão do ORGANIZADOR (painel, saque, PDF). Três casos:
// 1) Taxas reais já sincronizadas e cobrança liquidada (asaas_real_net): líquido = o que ficou no
//    Asaas − comissão, + o que o vale cobre (covered_fee) + ajuste repassado (covered_adjustment).
//    Num evento com vale, isso dá exatamente o valor "limpo" (pago − comissão − tarifa Pix/cartão).
// 2) Evento com vale (covered_fee não-null) ainda não liquidado: valor limpo direto do netValue.
// 3) Sem sync (eventos antigos/arquivados): fórmula de sempre, inalterada.
// O ajuste entra no Bruto e a parte coberta sai da Taxa, pra Bruto − Comissão − Taxa = Líquido
// continuar fechando sem citar o vale.
export function auditFigures(r: AuditableRow): AuditFigures {
  const estorno = Number(r.refunded_amount ?? 0);
  const comissao = Number(r.platform_fee ?? 0);
  const ajuste = Number(r.covered_adjustment ?? 0);
  const pago = Number(r.amount ?? r.base_amount ?? 0);
  if (r.asaas_real_net != null || (r.covered_fee != null && r.asaas_net_value != null)) {
    const bruto = pago - estorno + ajuste;
    const liquido = r.asaas_real_net != null
      ? Number(r.asaas_real_net) - comissao + Number(r.covered_fee ?? 0) + ajuste
      : Number(r.asaas_net_value) - comissao - estorno + ajuste;
    return { bruto, comissao, taxaAsaas: round2(bruto - comissao - liquido), liquido: round2(liquido) };
  }
  const bruto = pago - estorno;
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

const round2 = (n: number) => Math.round(n * 100) / 100 || 0; // sem -0

// Cartão pago que o Asaas ainda não liquidou (nem antecipou): aparece como "aguardando
// liquidação" e NÃO entra no saldo disponível pra saque. Só vale pra linhas já sincronizadas.
export function isAwaitingSettlement(r: AuditableRow): boolean {
  return isFinancialRow(r) && r.asaas_fees_synced_at != null && r.asaas_real_net == null;
}

// Líquido que entra no saldo pra saque (organizador e espelho no Admin).
export function availableNet(regs: AuditableRow[]): number {
  return regs.filter(r => isFinancialRow(r) && !isAwaitingSettlement(r)).reduce((s, r) => s + auditFigures(r).liquido, 0);
}

// Visão do ADMIN: taxas reais do Asaas e o vale Fábio, por evento. Inclui linhas com dinheiro no
// Asaas que não são "financeiras" pro organizador (chargeback: cancelada sem refunded_amount, mas
// com custo real) — é o vale que cobre esse custo, por isso o organizador não vê.
export interface RealFeeSummary {
  liquidadas: number;
  aguardando: number;
  tarifa: number;
  mensageria: number;
  antecipacao: number;
  notificacao: number;
  outros: number;
  liquidoReal: number;        // o que as cobranças liquidadas deixaram no Asaas − comissão
  valeTaxas: number;          // taxa assumida (covered_fee)
  valeAjuste: number;         // ajustes repassados (covered_adjustment)
  liquidoOrganizador: number; // = liquidoReal + valeTaxas + valeAjuste (liquidadas)
}

export function sumRealFees(regs: AuditableRow[]): RealFeeSummary {
  const acc: RealFeeSummary = { liquidadas: 0, aguardando: 0, tarifa: 0, mensageria: 0, antecipacao: 0, notificacao: 0, outros: 0, liquidoReal: 0, valeTaxas: 0, valeAjuste: 0, liquidoOrganizador: 0 };
  for (const r of regs) {
    if (isAwaitingSettlement(r)) { acc.aguardando++; continue; }
    if (r.asaas_real_net == null) continue;
    const financeira = isFinancialRow(r);
    const comissao = financeira ? Number(r.platform_fee ?? 0) : 0;
    const ajuste = financeira ? Number(r.covered_adjustment ?? 0) : 0;
    const vale = Number(r.covered_fee ?? 0);
    const real = Number(r.asaas_real_net) - comissao;
    if (financeira) acc.liquidadas++;
    acc.tarifa += Number(r.asaas_payment_fee ?? 0);
    acc.mensageria += Number(r.asaas_messaging_fee ?? 0);
    acc.antecipacao += Number(r.asaas_anticipation_fee ?? 0);
    acc.notificacao += Number(r.asaas_notification_fee ?? 0);
    acc.outros += Number(r.asaas_other_fee ?? 0);
    acc.liquidoReal += real;
    acc.valeTaxas += vale;
    acc.valeAjuste += ajuste;
    acc.liquidoOrganizador += real + vale + ajuste;
  }
  for (const k of Object.keys(acc) as (keyof RealFeeSummary)[]) acc[k] = round2(acc[k]);
  return acc;
}

// Taxa da plataforma: sempre 10% do valor ORIGINAL da inscrição (base_amount +
// discount_amount, isto é, antes do cupom), nunca do total pós-desconto. Regra
// vigente desde 11/08/2026 (ver "fixed_commission_original_price"). Duplicada
// em dois lugares de AdminDashboard.tsx antes de virar essa função única.
export function platformFeeFromOriginal(baseAmount: number | null | undefined, discountAmount: number | null | undefined): number {
  return Math.round((Number(baseAmount ?? 0) + Number(discountAmount ?? 0)) * 0.10 * 100) / 100;
}
