import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { asaasHeaders } from '../_shared/asaas.ts'
import { type AsaasTx, coveredFee, feesFromTransactions, groupByPayment } from '../_shared/asaasFees.ts'

// Grava em cada inscrição paga dos eventos ativos as taxas REAIS que o Asaas cobrou (extrato
// GET /financialTransactions), o líquido real e se já liquidou. SÓ LÊ o Asaas: nunca cria cliente,
// cobrança nem altera nada lá. No banco, só escreve as colunas de taxa (asaas_*_fee, asaas_real_net,
// asaas_settled_at, asaas_invoice_number, asaas_fees_synced_at, covered_fee) — nunca amount,
// status, registration_number, asaas_net_value nem saques. Notion: "URGENTE — 022RUNNERS: Painel
// registrar TODAS as taxas reais do Asaas (mensageria + antecipação)".
//
// covered_fee = "vale Fábio": nos eventos de fee_coverage_events, a parte das taxas além da tarifa
// Pix/cartão (mensageria, antecipação, WhatsApp, chargeback) que o Sr. Fábio assume. Fora desses
// eventos fica null.
//
// Só Admin chama (botão no Admin e ao abrir o Admin, se a última sync tiver mais de 1h).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

async function asaasGet(path: string) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, { headers: asaasHeaders })
  if (!res.ok) throw new Error(`Asaas GET ${path} -> ${res.status}`)
  return res.json()
}

const day = (d: Date) => d.toISOString().slice(0, 10)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Só Admin.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: auth } = await supabase.auth.getUser(token)
    if (!auth?.user) return json({ ok: false, message: 'Não autenticado.' }, 401)
    const { data: me } = await supabase.from('users').select('role').eq('id', auth.user.id).maybeSingle()
    if (me?.role !== 'admin') return json({ ok: false, message: 'Só Admin.' }, 403)

    // Eventos ativos (não arquivados, prova há no máximo 45 dias). Passados/arquivados: não mexe.
    const since = new Date(Date.now() - 45 * 86400000)
    const { data: events, error: evErr } = await supabase
      .from('events').select('id, date').is('archived_at', null).gte('date', day(since))
    if (evErr) throw evErr
    const eventIds = (events ?? []).map(e => e.id)
    if (eventIds.length === 0) return json({ ok: true, updated: 0, message: 'Nenhum evento ativo.' })

    const { data: coverage, error: covErr } = await supabase
      .from('fee_coverage_events').select('event_id, covers_until').in('event_id', eventIds)
    if (covErr) throw covErr
    const coverageUntil = new Map((coverage ?? []).map(c => [c.event_id, c.covers_until as string | null]))

    const { data: regs, error: regErr } = await supabase
      .from('registrations')
      .select('id, event_id, status, asaas_payment_id, asaas_invoice_number, paid_at, created_at, refunded_amount, asaas_net_value, asaas_payment_fee, asaas_messaging_fee, asaas_anticipation_fee, asaas_notification_fee, asaas_other_fee, asaas_real_net, asaas_settled_at, covered_fee')
      .in('event_id', eventIds)
      .not('asaas_payment_id', 'is', null)
    if (regErr) throw regErr
    // Só o que tem dinheiro: pago/confirmado, estornado, ou que já recebeu netValue do webhook
    // (pega chargeback, que vira 'cancelled').
    const targets = (regs ?? []).filter(r =>
      r.status === 'paid' || r.status === 'confirmed' || Number(r.refunded_amount ?? 0) > 0 || r.asaas_net_value != null)
    if (targets.length === 0) return json({ ok: true, updated: 0 })

    // Número da fatura (liga antecipação/WhatsApp, que vêm sem paymentId). Busca 1x e guarda.
    const invoiceByPid: Record<string, string> = {}
    for (const r of targets) {
      if (r.asaas_invoice_number) { invoiceByPid[r.asaas_payment_id] = r.asaas_invoice_number; continue }
      const p = await asaasGet(`/payments/${r.asaas_payment_id}`)
      if (p?.invoiceNumber) invoiceByPid[r.asaas_payment_id] = String(p.invoiceNumber)
    }
    const paymentByInvoice = Object.fromEntries(Object.entries(invoiceByPid).map(([pid, inv]) => [inv, pid]))

    // Extrato desde a inscrição mais antiga até amanhã.
    const oldest = targets.reduce((m, r) => {
      const d = new Date(r.paid_at ?? r.created_at)
      return d < m ? d : m
    }, new Date())
    const start = day(new Date(oldest.getTime() - 86400000))
    const finish = day(new Date(Date.now() + 86400000))
    const tx: AsaasTx[] = []
    for (let offset = 0; ; offset += 100) {
      const page = await asaasGet(`/financialTransactions?startDate=${start}&finishDate=${finish}&limit=100&offset=${offset}`)
      tx.push(...(page.data ?? []))
      if (!page.hasMore) break
    }
    const byPayment = groupByPayment(tx, paymentByInvoice)

    const now = new Date().toISOString()
    let updated = 0
    let awaiting = 0
    for (const r of targets) {
      const f = feesFromTransactions(byPayment.get(r.asaas_payment_id) ?? [])
      if (f.settled_at == null) awaiting++
      const until = coverageUntil.get(r.event_id)
      const covered = coverageUntil.has(r.event_id) && (until == null || (r.paid_at ?? r.created_at) <= `${until}T23:59:59`)
      const patch = {
        asaas_invoice_number: invoiceByPid[r.asaas_payment_id] ?? null,
        asaas_payment_fee: f.payment_fee,
        asaas_messaging_fee: f.messaging_fee,
        asaas_anticipation_fee: f.anticipation_fee,
        asaas_notification_fee: f.notification_fee,
        asaas_other_fee: f.other_fee,
        asaas_real_net: f.real_net,
        asaas_settled_at: f.settled_at,
        // Coberto pelo vale: só depois de liquidar (antes disso o painel já usa o valor limpo).
        covered_fee: covered ? (f.settled_at != null ? coveredFee(f) : 0) : null,
        asaas_fees_synced_at: now,
      }
      const { error } = await supabase.from('registrations').update(patch).eq('id', r.id)
      if (error) throw error
      updated++
    }

    return json({ ok: true, updated, awaiting_settlement: awaiting, synced_at: now })
  } catch (e) {
    console.error('[sync-asaas-fees]', String(e))
    return json({ ok: false, message: String(e instanceof Error ? e.message : e) }, 500)
  }
})
