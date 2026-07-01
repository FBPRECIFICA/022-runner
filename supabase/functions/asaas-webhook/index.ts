import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Always return 200 to prevent Asaas from retrying
  try {
    const body = await req.json()
    const { event, payment } = body

    console.log('[asaas-webhook] Evento recebido:', event, '| payment.id:', payment?.id, '| externalReference:', payment?.externalReference)

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
      const now = new Date().toISOString()

      let registrationId: string | null = null

      // Tenta buscar pelo asaas_payment_id primeiro
      if (payment?.id) {
        const { data: byPaymentId } = await supabase
          .from('registrations')
          .select('id')
          .eq('asaas_payment_id', payment.id)
          .single()

        if (byPaymentId?.id) {
          registrationId = byPaymentId.id
          console.log('[asaas-webhook] Encontrado por asaas_payment_id:', registrationId)
        }
      }

      // Fallback: busca pelo externalReference
      if (!registrationId && payment?.externalReference) {
        registrationId = payment.externalReference
        console.log('[asaas-webhook] Usando externalReference:', registrationId)
      }

      if (!registrationId) {
        console.warn('[asaas-webhook] Nenhuma referência encontrada no pagamento:', JSON.stringify(payment))
        return new Response(JSON.stringify({ received: true, warning: 'no reference found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Atualiza status para 'paid' e registra paid_at
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'paid', paid_at: now })
        .eq('id', registrationId)

      if (updateError) {
        console.error('[asaas-webhook] Erro ao atualizar registration:', updateError.message)
      } else {
        console.log('[asaas-webhook] Registration atualizado para paid:', registrationId)
      }

      // Incrementa uso do cupom (se aplicado) agora que o pagamento foi confirmado
      const { data: regForCoupon } = await supabase
        .from('registrations')
        .select('coupon_code')
        .eq('id', registrationId)
        .single()
      if (regForCoupon?.coupon_code) {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('id, current_uses')
          .eq('code', regForCoupon.coupon_code)
          .single()
        if (coupon?.id) {
          await supabase
            .from('coupons')
            .update({ current_uses: (coupon.current_uses ?? 0) + 1 })
            .eq('id', coupon.id)
        }
      }

      // Busca dados para enviar email de confirmação
      const { data: reg } = await supabase
        .from('registrations')
        .select('*, events(title, city, date)')
        .eq('id', registrationId)
        .single()

      if (reg?.email) {
        const eventData = reg.events as Record<string, unknown> | null
        const eventDate = eventData?.date
          ? new Date(String(eventData.date)).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
          : ''

        console.log('[asaas-webhook] Enviando email de confirmação para:', reg.email)

        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            templateType: 'atleta_confirmacao',
            recipientEmail: reg.email,
            data: {
              athleteName: reg.name,
              eventTitle: eventData?.title ?? '',
              eventDate,
              eventCity: eventData?.city ?? '',
              distanceName: reg.distance_name,
              registrationNumber: reg.registration_number,
              amount: Number(reg.amount).toFixed(2).replace('.', ','),
              baseAmount: Number(reg.base_amount ?? reg.amount).toFixed(2).replace('.', ','),
              platformFee: Number(reg.platform_fee ?? 0).toFixed(2).replace('.', ','),
              discountAmount: Number(reg.discount_amount ?? 0).toFixed(2).replace('.', ','),
              couponCode: reg.coupon_code ?? '',
            },
          }),
        }).catch(e => console.error('[asaas-webhook] Erro ao enviar email:', String(e)))
      }
    } else {
      console.log('[asaas-webhook] Evento ignorado:', event)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[asaas-webhook] Erro geral:', String(e))
    // Retorna 200 mesmo em erro para o Asaas não reenviar
    return new Response(JSON.stringify({ received: true, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
