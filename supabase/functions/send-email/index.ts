import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = '022RUNNERS <noreply@022runners.com.br>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HTML_OPEN = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>022RUNNERS</title></head><body style="margin:0;padding:16px;background:#f3f4f6;">'
const HTML_CLOSE = '</body></html>'
const BASE_STYLE = 'font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;'
const HEADER = '<div style="background:#000;padding:24px;text-align:center;border-bottom:3px solid #C9A84C;"><h1 style="color:#C9A84C;font-size:28px;font-weight:900;margin:0;letter-spacing:2px;">022RUNNERS</h1><p style="color:#94a3b8;font-size:12px;margin:4px 0 0;">RUNNING COMMUNITY - REGIAO DOS LAGOS RJ</p></div>'
const FOOTER = '<div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb;"><p style="color:#9ca3af;font-size:11px;margin:0;">022runners.com.br - Sao Pedro da Aldeia, RJ</p><p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Duvidas? WhatsApp: (22) 97404-4125</p></div>'

function row(label: string, value: string) {
  return `<tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:13px;width:40%;">${label}</td><td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:600;">${value}</td></tr>`
}

function buildHtml(templateType: string, data: Record<string, unknown>): { subject: string; html: string } {
  if (templateType === 'atleta_confirmacao') {
    return {
      subject: `Inscricao confirmada - ${data.eventTitle}`,
      html: `${HTML_OPEN}<div style="${BASE_STYLE}">${HEADER}<div style="padding:32px 24px;"><p style="color:#374151;font-size:16px;margin:0 0 16px;">Ola, <strong>${data.athleteName}</strong>!</p><p style="color:#374151;font-size:15px;margin:0 0 24px;">Sua inscricao foi confirmada. Boa corrida!</p><div style="background:#fffbeb;border:2px solid #C9A84C;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;"><p style="color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px;">Numero de Peito</p><p style="color:#C9A84C;font-size:56px;font-weight:900;font-family:monospace;margin:0;">#${data.registrationNumber}</p><p style="color:#92400e;font-size:12px;margin:8px 0 0;">Apresente este email no check-in</p></div><table style="width:100%;border-collapse:collapse;margin:0 0 24px;">${row('Evento', String(data.eventTitle))}${row('Data', String(data.eventDate))}${row('Local', String(data.eventCity))}${row('Distancia', String(data.distanceName))}${row('Valor', `R$ ${data.amount}`)}</table><div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;font-size:13px;color:#166534;"><strong>No dia do evento:</strong><br>- Chegue 30 minutos antes<br>- Apresente este email ou numero de peito</div></div>${FOOTER}</div>${HTML_CLOSE}`,
    }
  }

  if (templateType === 'atleta_lembrete') {
    return {
      subject: `Faltam 3 dias - ${data.eventTitle}`,
      html: `${HTML_OPEN}<div style="${BASE_STYLE}">${HEADER}<div style="padding:32px 24px;"><p style="color:#374151;font-size:16px;margin:0 0 16px;">Ola, <strong>${data.athleteName}</strong>!</p><p style="color:#374151;font-size:15px;margin:0 0 24px;">Faltam <strong>3 dias</strong> para o seu evento!</p><div style="background:#fffbeb;border:2px solid #C9A84C;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;"><p style="color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin:0 0 6px;">Numero de Peito</p><p style="color:#C9A84C;font-size:48px;font-weight:900;font-family:monospace;margin:0;">#${data.registrationNumber}</p></div><table style="width:100%;border-collapse:collapse;">${row('Evento', String(data.eventTitle))}${row('Data', String(data.eventDate))}${row('Largada', String(data.eventTime))}${row('Local', String(data.eventCity))}</table></div>${FOOTER}</div>${HTML_CLOSE}`,
    }
  }

  if (templateType === 'atleta_resultado') {
    return {
      subject: `Seu resultado - ${data.eventTitle}`,
      html: `${HTML_OPEN}<div style="${BASE_STYLE}">${HEADER}<div style="padding:32px 24px;text-align:center;"><p style="color:#374151;font-size:16px;margin:0 0 8px;">Parabens, <strong>${data.athleteName}</strong>!</p><div style="background:#fffbeb;border:2px solid #C9A84C;border-radius:12px;padding:24px;margin:16px 0;"><p style="color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 8px;">Seu Tempo</p><p style="color:#C9A84C;font-size:48px;font-weight:900;font-family:monospace;margin:0;">${data.finishTime}</p></div><table style="width:100%;border-collapse:collapse;text-align:left;">${row('Posicao Geral', `${data.positionGeneral}o`)}${row('Posicao Categoria', `${data.positionCategory}o`)}</table></div>${FOOTER}</div>${HTML_CLOSE}`,
    }
  }

  if (templateType === 'organizador_nova_inscricao') {
    return {
      subject: `Nova inscricao - ${data.eventTitle}`,
      html: `${HTML_OPEN}<div style="${BASE_STYLE}">${HEADER}<div style="padding:32px 24px;"><p style="color:#374151;font-size:16px;margin:0 0 16px;">Nova inscricao em <strong>${data.eventTitle}</strong>!</p><div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:0 0 20px;"><p style="color:#166534;font-size:20px;font-weight:700;margin:0;">Total de inscritos: ${data.totalRegistrations}</p></div><table style="width:100%;border-collapse:collapse;margin:0 0 20px;">${row('Atleta', String(data.athleteName))}${row('E-mail', String(data.athleteEmail))}${row('Distancia', String(data.distanceName))}${row('Valor', `R$ ${data.amount}`)}${row('Pagamento', (data.paymentStatus === 'paid' || data.paymentStatus === 'confirmed') ? 'Confirmado' : 'Pendente')}</table><a href="https://022runners.com.br/organizador" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">Ver painel</a></div>${FOOTER}</div>${HTML_CLOSE}`,
    }
  }

  if (templateType === 'organizador_resumo_diario') {
    return {
      subject: `Resumo do dia - ${data.eventTitle}`,
      html: `${HTML_OPEN}<div style="${BASE_STYLE}">${HEADER}<div style="padding:32px 24px;"><p style="color:#374151;font-size:16px;margin:0 0 20px;">Resumo de hoje - <strong>${data.eventTitle}</strong></p><table style="width:100%;border-collapse:collapse;margin:0 0 24px;">${row('Novas inscricoes hoje', String(data.newRegistrationsToday))}${row('Total de inscritos', String(data.totalRegistrations))}${row('Receita acumulada', `R$ ${data.totalRevenue}`)}${row('Dias para o evento', `${data.daysUntilEvent} dias`)}</table><a href="https://022runners.com.br/organizador" style="display:inline-block;background:#C9A84C;color:#000;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;font-size:14px;">Ver painel</a></div>${FOOTER}</div>${HTML_CLOSE}`,
    }
  }

  return { subject: 'Notificacao 022RUNNERS', html: `${HTML_OPEN}<div>${JSON.stringify(data)}</div>${HTML_CLOSE}` }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { templateType, recipientEmail, data } = await req.json()

    if (!recipientEmail || !templateType) {
      return new Response(JSON.stringify({ error: 'recipientEmail e templateType são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // For organizer emails, look up organizer email from Supabase if not provided
    let finalRecipientEmail = recipientEmail
    if (templateType === 'organizador_nova_inscricao' && data.eventId && !recipientEmail) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      const { data: event } = await supabase
        .from('events')
        .select('organizer_id')
        .eq('id', data.eventId)
        .single()
      if (event?.organizer_id) {
        const { data: organizer } = await supabase
          .from('users')
          .select('email')
          .eq('id', event.organizer_id)
          .single()
        if (organizer?.email) finalRecipientEmail = organizer.email
      }
    }

    const { subject, html } = buildHtml(templateType, data as Record<string, unknown>)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: finalRecipientEmail,
        subject,
        html,
      }),
    })

    const result = await res.json()
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
