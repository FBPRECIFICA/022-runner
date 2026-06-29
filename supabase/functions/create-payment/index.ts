import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { registrationId, billingType, customerData, paymentData } = await req.json()

    console.log('[create-payment] Criando cliente:', JSON.stringify(customerData))
    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(customerData),
    })
    const customer = await customerRes.json()
    console.log('[create-payment] Resposta cliente:', JSON.stringify(customer))

    if (!customer.id) {
      console.error('[create-payment] Falha ao criar cliente:', JSON.stringify(customer))
      return new Response(JSON.stringify({ error: 'Falha ao criar cliente', details: customer }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const paymentBody = {
      customer: customer.id,
      billingType,
      externalReference: registrationId,
      ...paymentData,
    }
    console.log('[create-payment] Criando pagamento:', JSON.stringify(paymentBody))
    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers: asaasHeaders,
      body: JSON.stringify(paymentBody),
    })
    const payment = await paymentRes.json()
    console.log('[create-payment] Resposta pagamento:', JSON.stringify(payment))

    if (!payment.id) {
      console.error('[create-payment] Falha ao criar pagamento:', JSON.stringify(payment))
      return new Response(JSON.stringify({ error: 'Falha ao criar pagamento', details: payment }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result: Record<string, unknown> = {
      paymentId: payment.id,
      status: payment.status,
      paymentLink: payment.invoiceUrl,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      barCode: payment.nossoNumero,
    }

    if (billingType === 'PIX') {
      console.log('[create-payment] Buscando QR Code PIX para:', payment.id)
      const pixRes = await fetch(`${ASAAS_BASE_URL}/payments/${payment.id}/pixQrCode`, {
        headers: asaasHeaders,
      })
      const pixData = await pixRes.json()
      console.log('[create-payment] PIX QR Code:', JSON.stringify({ encodedImage: pixData.encodedImage ? '[base64]' : null, payload: pixData.payload }))
      result.pixQrCode = {
        encodedImage: pixData.encodedImage ?? null,
        payload: pixData.payload ?? null,
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[create-payment] Erro:', String(e))
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
