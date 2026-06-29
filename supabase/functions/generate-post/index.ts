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
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY nao configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const bgInstruction = imageBase64
      ? `Use a imagem fornecida como fundo (background-image com a base64 embutida diretamente no style). Aplique overlay escuro dramático sobre ela.`
      : `Fundo: gradiente dramático linear de #000000 para #1a0800 (diagonal 135deg). Sobre o fundo, adicione 6 linhas diagonais finas douradas (width:1px, background:rgba(201,168,76,0.3), transform:rotate(-45deg), position:absolute, espalhadas pelo quadro).`

    const divulgacaoPrompt = `Crie um post HTML profissional de DIVULGAÇÃO para evento de corrida. Retorne APENAS HTML puro começando com <div, sem markdown, sem explicações.

Dados do evento:
Nome: ${eventData.title}
Data: ${eventData.date}
Local: ${eventData.location || eventData.city}
Distância: ${eventData.distance}
Preço: R$ ${eventData.price}
Cidade: ${eventData.city}

ESTRUTURA HTML OBRIGATÓRIA (width:1080px; height:1080px; overflow:hidden; position:relative; font-family:Arial,sans-serif):

1. FUNDO: ${bgInstruction}

2. LOGO TOPO: position:absolute; top:40px; left:50%; transform:translateX(-50%); text-align:center
   - "022RUNNERS" em font-size:56px; font-weight:900; color:#fff; text-shadow:-2px -2px 0 #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000
   - "RUNNING COMMUNITY" em font-size:18px; color:#C9A84C; letter-spacing:4px

3. ÍCONES: 🏃 nos cantos superiores (position:absolute; top:30px; font-size:52px; left:30px e right:30px)

4. PINCELADA DOURADA: position:absolute; top:320px; left:0; width:100%; height:160px; background:#C9A84C; clip-path:polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%); opacity:0.92; z-index:1

5. NOME DO EVENTO: position:absolute; top:330px; left:50%; transform:translateX(-50%); width:90%; text-align:center; z-index:2
   - font-size:80px; font-weight:900; color:#FFFFFF; font-family:Arial Black,Arial,sans-serif; text-shadow:3px 3px 0 #000; text-transform:uppercase; line-height:1.1

6. DISTÂNCIA: position:absolute; top:510px; left:50%; transform:translateX(-50%); font-size:90px; font-weight:900; color:#C9A84C; font-family:Arial Black,Arial,sans-serif; z-index:2; white-space:nowrap

7. DATA: position:absolute; top:640px; left:50%; transform:translateX(-50%); font-size:36px; color:#fff; z-index:2; white-space:nowrap — "📅 ${eventData.date}"

8. LOCAL: position:absolute; top:700px; left:50%; transform:translateX(-50%); font-size:32px; color:#CCCCCC; z-index:2; white-space:nowrap; text-align:center — "📍 ${eventData.location || eventData.city}"

9. INSCRIÇÕES: position:absolute; top:770px; left:50%; transform:translateX(-50%); font-size:34px; font-weight:700; color:#C9A84C; z-index:2; letter-spacing:2px — "✅ INSCRIÇÕES ABERTAS"

10. RODAPÉ: position:absolute; bottom:0; left:0; width:100%; height:130px; background:#000; border-top:3px solid #C9A84C; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:3
    - "022RUNNERS" em font-size:40px; font-weight:900; color:#fff
    - "022runners.com.br" em font-size:26px; color:#C9A84C`

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
