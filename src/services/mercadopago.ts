// Mercado Pago integration — set VITE_MERCADOPAGO_PUBLIC_KEY in .env
const MP_ACCESS_TOKEN = import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '';

export interface PixPayment {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  status: string;
}

export async function createPixPayment(registration: {
  id: string;
  name: string;
  email: string;
  amount: number;
  eventTitle: string;
}): Promise<PixPayment | null> {
  if (!MP_ACCESS_TOKEN) {
    console.warn('VITE_MERCADOPAGO_ACCESS_TOKEN not set — using simulated PIX');
    return null;
  }
  try {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': registration.id,
      },
      body: JSON.stringify({
        transaction_amount: registration.amount,
        description: registration.eventTitle,
        payment_method_id: 'pix',
        payer: { email: registration.email, first_name: registration.name.split(' ')[0] },
      }),
    });
    const data = await res.json();
    return data.point_of_interaction?.transaction_data
      ? { id: data.id, qr_code: data.point_of_interaction.transaction_data.qr_code,
          qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
          ticket_url: data.point_of_interaction.transaction_data.ticket_url, status: data.status }
      : null;
  } catch (e) { console.error('Mercado Pago error:', e); return null; }
}

export async function checkPaymentStatus(paymentId: string): Promise<string> {
  if (!MP_ACCESS_TOKEN) return 'pending';
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });
    const data = await res.json();
    return data.status || 'pending';
  } catch { return 'pending'; }
}
