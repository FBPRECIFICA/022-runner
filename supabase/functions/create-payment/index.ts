import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { INVALID_BIRTHDATE_MESSAGE, isBirthdateValid } from '../_shared/birthdate.ts'
import { voidAsaasPayment } from '../_shared/asaas.ts'

const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY') ?? ''
const ASAAS_BASE_URL = 'https://api.asaas.com/v3'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const asaasHeaders = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_API_KEY,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const INVALID_EMAIL_MESSAGE = 'O e-mail informado parece estar incorreto. Corrija e tente de novo.'

// Erro do Asaas ({ errors: [{ code, description }] }) vira { error, code, message }
// legível pro atleta. Antes saía só "Falha ao criar cliente" e o front mostrava
// "Edge Function returned a non-2xx status code" — a Patricia (09/10/2026,
// prcorado@hotmail.c) tentou 11 vezes em 45 min sem saber que era o e-mail.
function asaasError(stage: string, body: { errors?: { code?: string; description?: string }[] }) {
  const first = body?.errors?.[0]
  const code = first?.code ?? 'asaas_error'
  const message = code === 'invalid_email'
    ? INVALID_EMAIL_MESSAGE
    : (first?.description || `${stage}. Tente novamente em instantes.`)
  return new Response(JSON.stringify({ error: stage, code, message, details: body }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { registrationId, billingType, customerData, paymentData } = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Inscrição sem data de nascimento válida não gera cobrança (Balneário Run: 8
    // pagas sem data). Checa ANTES do Asaas; a PaymentPage pede a data e reenvia.
    const { data: reg } = registrationId
      ? await supabase.from('registrations')
          .select('birth_date, status, amount, asaas_payment_id, shirt_size, event_id')
          .eq('id', registrationId).maybeSingle()
      : { data: null }
    const reply = (status: number, body: Record<string, unknown>) =>
      new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (reg && reg.status !== 'pending' && reg.status !== 'awaiting_payment') {
      return reply(409, { error: 'not_pending', code: 'not_pending', message: 'Essa inscrição não está mais aguardando pagamento.' })
    }
    if (!reg || !isBirthdateValid(reg.birth_date)) {
      console.warn('[create-payment] Recusado por birth_date inválido:', registrationId, reg?.birth_date)
      return new Response(JSON.stringify({ error: 'invalid_birthdate', code: 'invalid_birthdate', message: INVALID_BIRTHDATE_MESSAGE }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Virada de lote: pendente com reserva vencida é repreçada se o lote virou
    // (só inscrições criadas pela regra nova; antigas nunca mudam). Valor novo
    // é mostrado ao atleta ANTES de gerar a cobrança.
    const { data: lot } = await supabase.rpc('refresh_pending_lot_price', { p_registration_id: registrationId }).maybeSingle()
    if (lot?.sold_out) {
      return reply(409, { error: 'kit_sold_out', code: 'kit_sold_out', message: 'As vagas deste kit esgotaram. Troque de kit para continuar.' })
    }
    if (lot?.changed) {
      if (reg.asaas_payment_id) {
        const voided = await voidAsaasPayment(reg.asaas_payment_id)
        if (!voided.ok) return reply(409, { error: 'void_failed', code: 'void_failed', message: voided.message })
        await supabase.from('registrations').update({ asaas_payment_id: null, payment_method: null }).eq('id', registrationId)
      }
      const fmt = (v: unknown) => Number(v).toFixed(2).replace('.', ',')
      return reply(409, {
        error: 'price_changed', code: 'price_changed', newAmount: Number(lot.new_amount), lotNumber: lot.lot_number,
        message: `O lote anterior esgotou. Sua inscrição agora está no ${lot.lot_number}º lote: novo valor R$ ${fmt(lot.new_amount)} (antes R$ ${fmt(lot.old_amount)}). Confira e gere o pagamento de novo.`,
      })
    }

    // Tamanho de camisa esgotado não é comprado nem por pendente antiga.
    if (reg.shirt_size) {
      const { data: avail } = await supabase.rpc('get_shirt_availability', { p_event_id: reg.event_id })
      const row = (avail || []).find((a: { size: string; available: number }) => a.size === reg.shirt_size)
      if (row && row.available <= 0) {
        return reply(409, { error: 'shirt_sold_out', code: 'shirt_sold_out', message: `O tamanho ${reg.shirt_size} esgotou. Troque o tamanho para continuar.` })
      }
    }

    // Valor cobrado vem sempre do banco, nunca do navegador.
    const amount = Number(reg.amount)
    if (!(amount > 0)) {
      return reply(409, { error: 'invalid_amount', code: 'invalid_amount', message: 'Essa inscrição não tem valor a pagar.' })
    }

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
      return asaasError('Falha ao criar cliente', customer)
    }

    const paymentBody = {
      customer: customer.id,
      billingType,
      externalReference: registrationId,
      ...paymentData,
      value: amount,
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
      return asaasError('Falha ao criar pagamento', payment)
    }

    // Salva asaas_payment_id e forma de pagamento na tabela registrations para o webhook encontrar
    if (registrationId && payment.id) {
      const { error: updateErr } = await supabase
        .from('registrations')
        .update({ asaas_payment_id: payment.id, payment_method: billingType })
        .eq('id', registrationId)
      if (updateErr) {
        console.error('[create-payment] Erro ao salvar asaas_payment_id:', updateErr.message)
      } else {
        console.log('[create-payment] asaas_payment_id salvo:', payment.id, 'para registration:', registrationId)
      }
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
        expirationDate: pixData.expirationDate ?? null,
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[create-payment] Erro:', String(e))
    return new Response(JSON.stringify({ error: String(e), code: 'internal_error', message: 'Erro ao gerar o pagamento. Tente novamente em instantes.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
