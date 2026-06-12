import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventData, imageBase64, postType } = await req.json()
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY não configurada no Vault')
    }

    const bgInstruction = imageBase64
      ? `Use a imagem fornecida como fundo (background-image com a base64 embutida diretamente no style). Aplique overlay escuro dramático sobre ela.`
      : `Fundo: gradiente radial de #1a0800 no centro para #000000 nas bordas. Adicione círculos decorativos dourados semitransparentes nos cantos.`

    const divulgacaoPrompt = `Crie um post profissional para divulgação do seguinte evento de corrida:
Nome: ${eventData.title}
Data: ${eventData.date}
Local: ${eventData.location || eventData.city}
Distância: ${eventData.distance}
Preço: R$ ${eventData.price}
Cidade: ${eventData.city}

ESTILO OBRIGATÓRIO:
- Tamanho exato: width:1080px; height:1080px; overflow:hidden; position:relative
- ${bgInstruction}
- Overlay: gradiente linear de baixo para cima rgba(0,0,0,0.15) até rgba(0,0,0,0.9)
- Logo 022RUNNERS: topo centro, texto branco Arial Black 52px com text-shadow outline, subtítulo 'RUNNING COMMUNITY' dourado #C9A84C 18px
- Pincelada dourada: div com background #C9A84C, clip-path polygon irregular, transform rotate(-2deg), opacity 0.92, position absolute atrás do título
- Título do evento: Arial Black bold 80px BRANCO, text-shadow preta 4px, centralizado, position:relative z-index acima da pincelada
- Distância: Arial Black 100px cor #C9A84C, destaque enorme
- Data com ícone 📅: 38px branco
- Local com ícone 📍: 34px #CCCCCC
- Faixa inferior: position absolute bottom:0, background #000 altura 130px, '022RUNNERS' branco 44px, '022runners.com.br' dourado #C9A84C 26px
- Ícones corredores 🏃 nos cantos superiores 52px, position absolute
- Layout DENSO sem espaço vazio, tudo com position absolute ou flex bem distribuído
- Estilo visual: igual a flyers profissionais de corridas de rua brasileiras`

    const resultadoPrompt = `Crie um post HTML profissional de RESULTADO para evento de corrida:
Nome: ${eventData.title}
Data: ${eventData.date}
Local: ${eventData.location || eventData.city}
Distância: ${eventData.distance}
Cidade: ${eventData.city}

ESTILO OBRIGATÓRIO:
- Tamanho exato: width:1080px; height:1080px; overflow:hidden; position:relative
- ${bgInstruction}
- Overlay escuro dramático sobre o fundo
- "RESULTADOS" no topo: Arial Black 96px dourado #C9A84C, text-shadow preta
- "PARABÉNS CORREDORES!" em branco bold 64px
- Nome do evento: 52px branco bold
- Distância do evento em destaque: Arial Black 80px #C9A84C
- Data e local: 34px #CCCCCC
- "VALEU DEMAIS!" em dourado #C9A84C 72px Arial Black
- "Veja seus resultados em 022runners.com.br" 28px dourado
- Ícones 🏃 nos cantos superiores 52px
- Faixa inferior preta com '022RUNNERS' e '022runners.com.br'
- Layout DENSO e profissional`

    const prompt = postType === 'resultado' ? resultadoPrompt : divulgacaoPrompt

    const userContent = imageBase64
      ? [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: prompt },
        ]
      : [{ type: 'text', text: prompt }]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system:
          'Você é um designer gráfico especialista em posts para eventos esportivos de corrida de rua. Gere APENAS código HTML+CSS inline completo para um post 1080x1080px profissional. Sem explicações, sem markdown, apenas o HTML puro começando com <div.',
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    const data = await response.json()
    if (!data.content?.[0]?.text) {
      throw new Error('Resposta inválida da IA: ' + JSON.stringify(data))
    }

    let html = data.content[0].text.trim()
    // Remove markdown code fences if Claude included them
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
