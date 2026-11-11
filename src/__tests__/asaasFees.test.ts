import { describe, expect, it } from 'vitest';
import { coveredFee, feesFromTransactions, groupByPayment, invoiceFromDescription } from '../../supabase/functions/_shared/asaasFees';
import { auditFigures, availableNet, isAwaitingSettlement, sumAuditFigures, sumRealFees } from '../lib/asaasFee';

// Lançamentos no formato real do extrato Asaas (conferidos em 11/11/2026).
const pixTx = [
  { type: 'PAYMENT_RECEIVED', value: 87.89, date: '2026-10-11', paymentId: 'pay_pix' },
  { type: 'PAYMENT_FEE', value: -1.99, date: '2026-10-11', paymentId: 'pay_pix' },
  { type: 'PAYMENT_MESSAGING_NOTIFICATION_FEE', value: -0.99, date: '2026-10-11', paymentId: 'pay_pix' },
];
const cardTx = [
  { type: 'RECEIVABLE_ANTICIPATION_GROSS_CREDIT', value: 87.89, date: '2026-10-14', description: 'Antecipação - fatura nr. 935840318 Fulano' },
  { type: 'RECEIVABLE_ANTICIPATION_FEE', value: -1.07, date: '2026-10-14', description: 'Taxa de antecipação - fatura nr. 935840318 Fulano' },
  { type: 'PAYMENT_FEE', value: -3.11, date: '2026-10-14', paymentId: 'pay_card' },
];
const chargebackTx = [
  { type: 'RECEIVABLE_ANTICIPATION_GROSS_CREDIT', value: 87.89, date: '2026-10-12', description: 'Antecipação - fatura nr. 934359983 X' },
  { type: 'RECEIVABLE_ANTICIPATION_FEE', value: -0.98, date: '2026-10-12', description: 'Taxa de antecipação - fatura nr. 934359983 X' },
  { type: 'PAYMENT_FEE', value: -3.11, date: '2026-10-12', paymentId: 'pay_cb' },
  { type: 'CHARGEBACK', value: -87.89, date: '2026-10-27', paymentId: 'pay_cb' },
  { type: 'CHARGEBACK_REVERSAL', value: 87.89, date: '2026-11-05', paymentId: 'pay_cb' },
  { type: 'PAYMENT_FEE_REVERSAL', value: 3.11, date: '2026-11-05', paymentId: 'pay_cb' },
  { type: 'RECEIVABLE_ANTICIPATION_DEBIT', value: -87.89, date: '2026-11-05', description: 'Baixa da antecipação - fatura nr. 934359983' },
];

describe('extrato Asaas → taxas reais', () => {
  it('lê o número da fatura da descrição', () => {
    expect(invoiceFromDescription('Taxa de antecipação - fatura nr. 964556022 Fulano')).toBe('964556022');
    expect(invoiceFromDescription('Taxa de notificação por WhatsApp da cobrança 949609554 X')).toBe('949609554');
    expect(invoiceFromDescription('Transação via Pix')).toBeNull();
  });

  it('liga antecipação (sem paymentId) à cobrança pelo número da fatura', () => {
    const g = groupByPayment(cardTx, { '935840318': 'pay_card' });
    expect(g.get('pay_card')).toHaveLength(3);
  });

  it('Pix: tarifa 1,99 + mensageria 0,99, líquido real = o que ficou no Asaas', () => {
    const f = feesFromTransactions(pixTx);
    expect(f).toMatchObject({ payment_fee: 1.99, messaging_fee: 0.99, anticipation_fee: 0, other_fee: 0, real_net: 84.91, settled_at: '2026-10-11' });
    expect(coveredFee(f)).toBe(0.99);
  });

  it('cartão antecipado: tarifa + antecipação; mensageria só vem na data do crédito', () => {
    const f = feesFromTransactions(groupByPayment(cardTx, { '935840318': 'pay_card' }).get('pay_card')!);
    expect(f).toMatchObject({ payment_fee: 3.11, messaging_fee: 0, anticipation_fee: 1.07, other_fee: 0, real_net: 83.71 });
    expect(coveredFee(f)).toBe(1.07);
  });

  it('chargeback revertido: sobra só o custo da antecipação (R$ 0,98)', () => {
    const f = feesFromTransactions(groupByPayment(chargebackTx, { '934359983': 'pay_cb' }).get('pay_cb')!);
    expect(f.real_net).toBe(-0.98);
    expect(f.payment_fee).toBe(0);
    expect(coveredFee(f)).toBe(0.98);
  });

  it('sem lançamento de crédito = ainda não liquidou', () => {
    expect(feesFromTransactions([]).real_net).toBeNull();
  });
});

describe('painel com vale Fábio', () => {
  // Pix R$ 87,89 (base 79,90 + comissão 7,99); netValue do webhook 85,90.
  const pix = { status: 'paid', amount: 87.89, platform_fee: 7.99, asaas_net_value: 85.9, asaas_real_net: 84.91, covered_fee: 0.99, asaas_fees_synced_at: 'x', asaas_payment_fee: 1.99, asaas_messaging_fee: 0.99 };

  it('organizador vê o valor limpo (pago − comissão − tarifa) e os 4 números fecham', () => {
    const f = auditFigures(pix);
    expect(f.liquido).toBe(77.91); // 85,90 − 7,99
    expect(Math.round((f.bruto - f.comissao - f.taxaAsaas) * 100) / 100).toBe(f.liquido);
    expect(f.taxaAsaas).toBe(1.99);
  });

  it('ajuste repassado (nº 031) entra no líquido e no bruto', () => {
    const f = auditFigures({ ...pix, covered_adjustment: 10 });
    expect(f.liquido).toBe(87.91);
    expect(f.bruto).toBe(97.89);
  });

  it('evento sem vale: líquido real (desconta mensageria e antecipação)', () => {
    const f = auditFigures({ ...pix, covered_fee: null });
    expect(f.liquido).toBe(76.92);
  });

  it('evento sem sync: fórmula antiga, inalterada', () => {
    const f = auditFigures({ status: 'paid', amount: 87.89, platform_fee: 7.99, asaas_net_value: 85.9, asaas_anticipation_fee: 0 });
    expect(f.liquido).toBeCloseTo(76.92, 2);
  });

  it('cartão não liquidado: valor limpo no total, fora do saldo, conta como aguardando', () => {
    const pend = { status: 'paid', amount: 56.9, platform_fee: 5.99, asaas_net_value: 54.71, asaas_real_net: null, covered_fee: 0, asaas_fees_synced_at: 'x' };
    expect(isAwaitingSettlement(pend)).toBe(true);
    expect(auditFigures(pend).liquido).toBe(48.72);
    expect(sumAuditFigures([pix, pend]).liquido).toBeCloseTo(126.63, 2);
    expect(availableNet([pix, pend])).toBeCloseTo(77.91, 2);
    expect(sumRealFees([pix, pend]).aguardando).toBe(1);
  });

  it('Admin: líquido real + vale = líquido do organizador; chargeback só no Admin', () => {
    const cb = { status: 'cancelled', amount: 87.89, platform_fee: 7.99, asaas_net_value: 84.78, asaas_real_net: -0.98, covered_fee: 0.98, asaas_fees_synced_at: 'x', asaas_anticipation_fee: 0.98 };
    const r = sumRealFees([pix, { ...pix, covered_adjustment: 10 }, cb]);
    expect(r.liquidadas).toBe(2);
    expect(r.liquidoReal).toBe(Math.round((76.92 * 2 - 0.98) * 100) / 100);
    expect(r.valeTaxas).toBe(2.96);
    expect(r.valeAjuste).toBe(10);
    expect(r.liquidoOrganizador).toBe(sumAuditFigures([pix, { ...pix, covered_adjustment: 10 }, cb]).liquido);
  });
});
