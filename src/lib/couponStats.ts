interface CouponUsageRow {
  coupon_code?: string | null;
  discount_amount?: number | string | null;
  created_at?: string | null;
  status?: string | null;
}

export interface CouponUsageSummary {
  code: string;
  usos: number;
  totalDiscount: number;
  lastUse: string;
}

const PAID_STATUSES = ['paid', 'confirmed'];

// Conta só inscrições pagas — cupom aplicado num checkout abandonado (nunca pago) não é uma
// venda real, e contar isso infla o número que o organizador usa pra avaliar parcerias de cupom.
export function summarizeCouponUsage<T extends CouponUsageRow>(regs: T[]): CouponUsageSummary[] {
  const byCode = new Map<string, CouponUsageSummary>();
  regs.forEach(r => {
    if (!r.coupon_code) return;
    if (!PAID_STATUSES.includes(r.status || '')) return;
    const entry = byCode.get(r.coupon_code) || { code: r.coupon_code, usos: 0, totalDiscount: 0, lastUse: r.created_at || '' };
    entry.usos += 1;
    entry.totalDiscount += Number(r.discount_amount || 0);
    if (r.created_at && new Date(r.created_at) > new Date(entry.lastUse)) entry.lastUse = r.created_at;
    byCode.set(r.coupon_code, entry);
  });
  return Array.from(byCode.values()).sort((a, b) => b.usos - a.usos);
}
