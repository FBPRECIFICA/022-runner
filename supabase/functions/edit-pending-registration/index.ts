import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { voidAsaasPayment } from '../_shared/asaas.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Deixa quem ainda não pagou trocar de kit/tamanho de camisa sozinho, sem
// precisar de suporte — pedido direto da Louhana (Notion "URGENTE — 022RUNNERS:
// Cliente Travada Sem Poder Trocar de Kit"). Edita a MESMA linha (mantém
// registration_number, termo_aceites já assinado, histórico), em vez de
// cancelar e recriar: (1) revalida estoque/vaga pro kit novo com as mesmas RPCs
// que o formulário original usa, (2) anula qualquer cobrança Asaas já gerada
// pro kit antigo (nunca pode sobrar uma cobrança viva com valor errado), (3)
// recalcula o valor sempre pela regra de sempre (10% do preço de tabela do kit
// novo — CLAUDE.md "Fonte única de comissão"), (4) zera cupom aplicado (o preço
// mudou, então o desconto salvo não vale mais) — quem quiser cupom reaplica
// normalmente na tela de pagamento, que já sabe recalcular em cima do valor
// atual sem duplicar essa lógica aqui.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { registrationId, registrationTypeId, shirtSize } = await req.json()
    if (!registrationId || !registrationTypeId) {
      return fail('registrationId e registrationTypeId são obrigatórios.')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data: reg, error: regError } = await supabase
      .from('registrations')
      .select('id, event_id, status, asaas_payment_id, elderly_discount, registration_type_id')
      .eq('id', registrationId)
      .single()

    if (regError || !reg) return fail('Inscrição não encontrada.', 404)
    if (reg.status !== 'pending') return fail('Essa inscrição não está mais pendente.')

    if (reg.registration_type_id === registrationTypeId) {
      return fail('Esse já é o kit atual dessa inscrição.')
    }

    const { data: kit, error: kitError } = await supabase
      .from('registration_types')
      .select('id, name, price, includes_shirt, distance_id, event_distances(id, name, event_id)')
      .eq('id', registrationTypeId)
      .single()

    if (kitError || !kit) return fail('Kit não encontrado.', 404)
    const distance = kit.event_distances as unknown as { id: string; name: string; event_id: string } | null
    if (!distance || distance.event_id !== reg.event_id) {
      return fail('Esse kit não pertence a este evento.')
    }

    const finalShirtSize = kit.includes_shirt ? (shirtSize || null) : null
    if (kit.includes_shirt && !finalShirtSize) {
      return fail('Selecione o tamanho da camiseta.')
    }

    // Mesma revalidação de disponibilidade que RegistrationPage.tsx faz no
    // submit original — sem isso, a troca poderia confirmar depois num tamanho/
    // evento que esgotou entre a abertura da tela e a troca.
    if (finalShirtSize) {
      const { data: avail } = await supabase.rpc('get_shirt_availability', { p_event_id: reg.event_id })
      const sizeRow = (avail || []).find((a: { size: string; available: number }) => a.size === finalShirtSize)
      if (sizeRow && sizeRow.available <= 0) {
        return fail(`O tamanho ${finalShirtSize} esgotou. Escolha outro tamanho.`)
      }
    }

    const listPrice = Number(kit.price ?? 0)
    const finalPrice = reg.elderly_discount ? Math.round(listPrice * 0.5 * 100) / 100 : listPrice
    const platformFee = Math.round(finalPrice * 0.10 * 100) / 100
    const discountAmount = reg.elderly_discount ? Math.round((listPrice - finalPrice) * 100) / 100 : 0

    if (reg.asaas_payment_id) {
      console.log('[edit-pending-registration] Anulando cobrança antiga:', reg.asaas_payment_id)
      const voidResult = await voidAsaasPayment(reg.asaas_payment_id)
      if (!voidResult.ok) {
        console.error('[edit-pending-registration] Falha ao anular cobrança:', voidResult.message)
        return fail(voidResult.message, 409)
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('registrations')
      .update({
        registration_type_id: kit.id,
        registration_type_name: kit.name,
        registration_type_price: listPrice,
        distance_name: distance.name,
        shirt_size: finalShirtSize,
        base_amount: finalPrice,
        platform_fee: platformFee,
        discount_amount: discountAmount,
        amount: finalPrice + platformFee,
        coupon_code: null,
        asaas_payment_id: null,
        payment_method: null,
      })
      .eq('id', registrationId)
      .eq('status', 'pending')
      .select('id')

    if (updateError || !updated || updated.length === 0) {
      console.error('[edit-pending-registration] Falha ao atualizar inscrição:', updateError?.message)
      return fail('Cobrança anulada, mas não foi possível atualizar a inscrição. Fale com o suporte.', 500)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('[edit-pending-registration] Erro:', String(e))
    return fail(String(e), 500)
  }
})
