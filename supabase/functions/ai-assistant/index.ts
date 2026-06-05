import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, eventData, platform, question } = await req.json()

    const systemPrompt = `Você é o assistente oficial da plataforma 022 RUNNER — a maior plataforma de eventos esportivos da Região dos Lagos, Rio de Janeiro.

SOBRE A PLATAFORMA:
- 022 RUNNER conecta organizadores e atletas de corrida, trail, ciclismo, triathlon e caminhada
- Cidades: Cabo Frio, Arraial do Cabo, Búzios, São Pedro da Aldeia, Iguaba Grande, Araruama, Saquarema
- Foco em eventos regionais com qualidade premium

TOM DE VOZ:
- Esportivo, motivacional, regional e inclusivo
- Use emojis com moderação
- Hashtags: #022runner #regiãodoslagos #corridaderua #cabofrio #buzios #saopedrodaaldeia

TIPOS DE POST:
- abertura_inscricoes: animado, urgência, destacar data e preço do 1º lote
- ultimas_vagas: urgência máxima, vagas restantes
- dia_evento: motivacional, logística, local e horário
- resultados: celebração, parabéns aos participantes

Instagram: máx 2200 chars, emojis, hashtags no final
WhatsApp: direto, sem hashtags, máx 500 chars
Facebook: formal, completo`

    const userPrompt = type === 'post'
      ? `Crie um post de ${eventData.postType} para o evento "${eventData.title}" em ${eventData.city} no dia ${eventData.date} para ${platform}. Distâncias: ${eventData.distances}. ${eventData.extraInfo || ''}`
      : `Responda essa dúvida sobre eventos esportivos da 022 RUNNER: ${question || eventData?.question || ''}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt
      })
    })

    const data = await response.json()
    if (!data.content?.[0]?.text) throw new Error('Resposta inválida da IA: ' + JSON.stringify(data))
    const text = data.content[0].text

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
