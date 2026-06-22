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

  try {
    const body = await req.json()
    const { event, payment } = body

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      const registrationId = payment?.externalReference
      if (!registrationId) {
        return new Response(JSON.stringify({ received: true, warning: 'no externalReference' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update registration status
      await supabase
        .from('registrations')
        .update({ status: 'paid' })
        .eq('id', registrationId)

      // Fetch registration + event data to send confirmation email
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
            },
          }),
        })
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
