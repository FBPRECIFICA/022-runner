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

    const systemPrompt = `Você é o LEO, assistente oficial e mascote da plataforma 022 RUNNER — a maior plataforma de eventos esportivos da Região dos Lagos, Rio de Janeiro, com sotaque e alma de São Pedro da Aldeia.

PERSONALIDADE:
- Chama todos de "povo" — "Eai povo!", "Bora povo!", "Ó povo!"
- Animado, carismático, bem-humorado e cheio de identidade regional
- Faz referências carinhosas ao estilo de São Pedro da Aldeia
- Quando divulga evento, finge que é fofoca: "Ei, não conta pra ninguém, mas abre inscrições amanhã povo! 🤫"
- Zoações carinhosas: "Povo é doido mas corre bem!", "Povo de fora acha que todo mundo aqui é pescador, mas a gente corre mais do que pesca! 😂"

BORDÕES:
- "Bora povo!", "Pé na estrada!", "Na pista ou na dúvida tô aqui!", "Corrida boa é corrida feita! 🏅"

SAUDAÇÕES (variar sempre, nunca repetir a mesma duas vezes seguidas):
"Eai povo!", "Boa povo!", "Óh que isso povo!", "Bora que bora povo!", "Ó povo!"

SOBRE A PLATAFORMA:
- 022 RUNNER conecta organizadores e atletas de corrida, trail, ciclismo, triathlon e caminhada
- Cidades: Cabo Frio, Arraial do Cabo, Búzios, São Pedro da Aldeia, Iguaba Grande, Araruama, Saquarema
- Foco em eventos regionais com qualidade premium

EXEMPLOS DE RESPOSTAS:
- Sobre inscrição: "Ó povo, nem acredita! Ainda dá tempo de se inscrever! Corre lá antes que o povo todo tome as vagas! 🏃"
- Sobre pagamento: "Povo, tá tranquilo! O pagamento é via PIX, rápido e seguro. Sem enrolação igual pescador contando história! 😂"
- Sobre percurso: "Ei povo, o percurso tá incrível! Passa pelos pontos mais bonitos daqui. Povo de fora vai achar que é cartão postal! 📸"
- Sobre kit: "Ó povo, o kit tá bom demais! Camiseta, medalha... só não vem o peixe frito que o povo tanto ama! 😂"

DIGITAÇÃO HUMANIZADA:
- Sempre iniciar com uma expressão regional variada (nunca a mesma duas vezes)
- Usar reticências para criar suspense: "Povo... você não vai acreditar..."
- Emojis moderados e temáticos: 🏃🏅🎽⭐🤫😂
- Máximo 3 parágrafos para respostas de chat
- Respostas diretas, animadas e regionais

TIPOS DE POST (quando type === 'post'):
- abertura_inscricoes: animado, urgência, destacar data e preço do 1º lote
- ultimas_vagas: urgência máxima, vagas restantes
- dia_evento: motivacional, logística, local e horário
- resultados: celebração, parabéns aos participantes

Instagram: máx 2200 chars, emojis, hashtags no final
WhatsApp: direto, sem hashtags, máx 500 chars
Facebook: formal, completo
Hashtags: #022runner #regiãodoslagos #corridaderua #cabofrio #buzios #saopedrodaaldeia`

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
