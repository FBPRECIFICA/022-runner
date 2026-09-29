import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { voidAsaasPayment } from '../_shared/asaas.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fecha a lacuna documentada no CLAUDE.md: até aqui nenhum código cancelava/anulava
// uma cobrança Asaas, só criava (create-payment). Isso forçava a policy
// "restrict_self_cancel_to_no_payment_started" a bloquear qualquer troca de kit pra
// quem já tinha gerado PIX/cartão/boleto — a inscrição pendente com asaas_payment_id
// não podia ser autocancelada, porque se a cobrança antiga fosse paga depois, o
// asaas-webhook reviveria o status pra 'paid' sem checar o estado atual (mesmo padrão
// do caso Isis/Isa em Balneário Run). Este endpoint resolve isso de verdade: anula a
// cobrança na Asaas primeiro (então ela nunca mais pode ser paga), só then cancela a
// inscrição no banco — nessa ordem, nunca ao contrário.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { registrationId, note } = await req.json()
    if (!registrationId) {
      return new Response(JSON.stringify({ ok: false, message: 'registrationId é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: reg, error: fetchError } = await supabase
      .from('registrations')
      .select('id, status, asaas_payment_id, user_id, event_id, registration_number, name, cpf, amount')
      .eq('id', registrationId)
      .single()

    if (fetchError || !reg) {
      return new Response(JSON.stringify({ ok: false, message: 'Inscrição não encontrada.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (reg.status !== 'pending') {
      return new Response(JSON.stringify({ ok: false, message: 'Essa inscrição não está mais pendente.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (reg.asaas_payment_id) {
      console.log('[cancel-pending-payment] Anulando cobrança na Asaas:', reg.asaas_payment_id)
      const voidResult = await voidAsaasPayment(reg.asaas_payment_id)
      if (!voidResult.ok) {
        console.error('[cancel-pending-payment] Falha ao anular cobrança:', voidResult.message)
        return new Response(JSON.stringify({ ok: false, message: voidResult.message }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Mesmo padrão defensivo do handleCancelPendingAndRetry no cliente: .select()
    // de volta pra garantir que a linha foi mesmo afetada, não confiar em "sem erro".
    const { data: cancelled, error: cancelError } = await supabase
      .from('registrations')
      .update({ status: 'cancelled' })
      .eq('id', registrationId)
      .eq('status', 'pending')
      .select('id')

    if (cancelError || !cancelled || cancelled.length === 0) {
      console.error('[cancel-pending-payment] Falha ao cancelar inscrição:', cancelError?.message)
      return new Response(JSON.stringify({ ok: false, message: 'Cobrança anulada, mas não foi possível cancelar a inscrição. Fale com o suporte.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await logOrganizerCancel(supabase, req, reg, note)

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[cancel-pending-payment] Erro:', String(e))
    return new Response(JSON.stringify({ ok: false, message: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Rastro em registration_manual_actions quando quem cancelou foi o organizador do evento (ou
// admin), não o próprio atleta — mesma tabela que organizer_cancel_registration alimenta.
// Não bloqueia: a cobrança já foi anulada e a inscrição cancelada, falha só vai pro log.
// deno-lint-ignore no-explicit-any
async function logOrganizerCancel(supabase: any, req: Request, reg: any, note: unknown) {
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!token) return
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user || user.id === reg.user_id) return

    const [{ data: ev }, { data: profile }] = await Promise.all([
      supabase.from('events').select('organizer_id').eq('id', reg.event_id).single(),
      supabase.from('users').select('role').eq('id', user.id).maybeSingle(),
    ])
    if (ev?.organizer_id !== user.id && profile?.role !== 'admin') return

    const { error } = await supabase.from('registration_manual_actions').insert({
      registration_id: reg.id,
      event_id: reg.event_id,
      action: 'cancel',
      actor_id: user.id,
      note: typeof note === 'string' && note.trim() ? note.trim() : null,
      details: {
        previous_status: 'pending', asaas_payment_voided: reg.asaas_payment_id,
        registration_number: reg.registration_number, name: reg.name, cpf: reg.cpf, amount: reg.amount,
      },
    })
    if (error) console.error('[cancel-pending-payment] Falha ao gravar registration_manual_actions:', error.message)
  } catch (e) {
    console.error('[cancel-pending-payment] Falha ao gravar registration_manual_actions:', String(e))
  }
}
