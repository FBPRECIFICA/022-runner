import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const FORMAT_DIMS: Record<string, { w: number; h: number }> = {
  feed:      { w: 1080, h: 1080 },
  stories:   { w: 1080, h: 1920 },
  whatsapp:  { w: 800,  h: 800  },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { eventData, imageBase64, postType, format } = await req.json()
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY nao configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const dims = FORMAT_DIMS[format] ?? FORMAT_DIMS.feed
    const { w, h } = dims

    const bgInstruction = imageBase64
      ? `Use a imagem fornecida como fundo (background-image com a base64 embutida diretamente no style). Aplique overlay escuro dramático sobre ela.`
      : `Fundo: gradiente dramático linear de #000000 para #1a0800 (diagonal 135deg). Sobre o fundo, adicione 6 linhas diagonais finas douradas (width:1px, background:rgba(201,168,76,0.3), transform:rotate(-45deg), position:absolute, espalhadas pelo quadro).`

    // Ajusta proporções dos elementos para Stories (retrato)
    const isStories = h > w
    const isWhatsapp = w === 800

    const scaleFactor = isWhatsapp ? 0.74 : 1
    const logoSize    = Math.round(56 * scaleFactor)
    const subLogoSize = Math.round(18 * scaleFactor)
    const iconSize    = Math.round(52 * scaleFactor)
    const titleSize   = Math.round(80 * scaleFactor)
    const distSize    = Math.round(90 * scaleFactor)
    const dateSize    = Math.round(36 * scaleFactor)
    const localSize   = Math.round(32 * scaleFactor)
    const inscSize    = Math.round(34 * scaleFactor)

    // Para Stories, a pincelada fica mais abaixo
    const brushTop = isStories ? 560 : 320
    const nameTop  = isStories ? 570 : 330
    const distTop  = isStories ? 760 : 510
    const dateTop  = isStories ? 910 : 640
    const locTop   = isStories ? 980 : 700
    const inscTop  = isStories ? 1060 : 770
    const footerH  = isStories ? 160 : 130

    const divulgacaoPrompt = `Crie um post HTML profissional de DIVULGAÇÃO para evento de corrida. Retorne APENAS HTML puro começando com <div, sem markdown, sem explicações.

Dados do evento:
Nome: ${eventData.title}
Data: ${eventData.date}
Local: ${eventData.location || eventData.city}
Distância: ${eventData.distance}
Preço: R$ ${eventData.price}
Cidade: ${eventData.city}

ESTRUTURA HTML OBRIGATÓRIA (width:${w}px; height:${h}px; overflow:hidden; position:relative; font-family:Arial,sans-serif):

1. FUNDO: ${bgInstruction}

2. LOGO TOPO: position:absolute; top:40px; left:50%; transform:translateX(-50%); text-align:center
   - "022RUNNERS" em font-size:${logoSize}px; font-weight:900; color:#fff; text-shadow:-2px -2px 0 #000, 2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000
   - "RUNNING COMMUNITY" em font-size:${subLogoSize}px; color:#C9A84C; letter-spacing:4px

3. ÍCONES: 🏃 nos cantos superiores (position:absolute; top:30px; font-size:${iconSize}px; left:30px e right:30px)

4. PINCELADA DOURADA: position:absolute; top:${brushTop}px; left:0; width:100%; height:160px; background:#C9A84C; clip-path:polygon(0% 20%, 100% 0%, 100% 80%, 0% 100%); opacity:0.92; z-index:1

5. NOME DO EVENTO: position:absolute; top:${nameTop}px; left:50%; transform:translateX(-50%); width:90%; text-align:center; z-index:2
   - font-size:${titleSize}px; font-weight:900; color:#FFFFFF; font-family:Arial Black,Arial,sans-serif; text-shadow:3px 3px 0 #000; text-transform:uppercase; line-height:1.1

6. DISTÂNCIA: position:absolute; top:${distTop}px; left:50%; transform:translateX(-50%); font-size:${distSize}px; font-weight:900; color:#C9A84C; font-family:Arial Black,Arial,sans-serif; z-index:2; white-space:nowrap

7. DATA: position:absolute; top:${dateTop}px; left:50%; transform:translateX(-50%); font-size:${dateSize}px; color:#fff; z-index:2; white-space:nowrap — "📅 ${eventData.date}"

8. LOCAL: position:absolute; top:${locTop}px; left:50%; transform:translateX(-50%); font-size:${localSize}px; color:#CCCCCC; z-index:2; white-space:nowrap; text-align:center — "📍 ${eventData.location || eventData.city}"

9. INSCRIÇÕES: position:absolute; top:${inscTop}px; left:50%; transform:translateX(-50%); font-size:${inscSize}px; font-weight:700; color:#C9A84C; z-index:2; letter-spacing:2px — "✅ INSCRIÇÕES ABERTAS"

10. RODAPÉ: position:absolute; bottom:0; left:0; width:100%; height:${footerH}px; background:#000; border-top:3px solid #C9A84C; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:3
    - "022RUNNERS" em font-size:${Math.round(40 * scaleFactor)}px; font-weight:900; color:#fff
    - "022runners.com.br" em font-size:${Math.round(26 * scaleFactor)}px; color:#C9A84C

IMPORTANTE: O container tem exatamente ${w}px de largura e ${h}px de altura. Use object-fit:contain em imagens para não cortar personagens ou elementos importantes. Nunca deixe elementos saírem do container.`

    const resultadoPrompt = `Crie um post HTML profissional de RESULTADO para evento de corrida:
Nome: ${eventData.title}
Data: ${eventData.date}
Local: ${eventData.location || eventData.city}
Distância: ${eventData.distance}
Cidade: ${eventData.city}

ESTILO OBRIGATÓRIO:
- Tamanho exato: width:${w}px; height:${h}px; overflow:hidden; position:relative
- ${bgInstruction}
- Overlay escuro dramático sobre o fundo
- "RESULTADOS" no topo: Arial Black ${Math.round(96 * scaleFactor)}px dourado #C9A84C, text-shadow preta
- "PARABÉNS CORREDORES!" em branco bold ${Math.round(64 * scaleFactor)}px
- Nome do evento: ${Math.round(52 * scaleFactor)}px branco bold
- Distância do evento em destaque: Arial Black ${Math.round(80 * scaleFactor)}px #C9A84C
- Data e local: ${Math.round(34 * scaleFactor)}px #CCCCCC
- "VALEU DEMAIS!" em dourado #C9A84C ${Math.round(72 * scaleFactor)}px Arial Black
- "Veja seus resultados em 022runners.com.br" ${Math.round(28 * scaleFactor)}px dourado
- Ícones 🏃 nos cantos superiores ${iconSize}px
- Faixa inferior preta com '022RUNNERS' e '022runners.com.br'
- Layout DENSO e profissional
- IMPORTANTE: nunca corte personagens — use object-fit:contain em imagens`

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
          `Você é um designer gráfico especialista em posts para eventos esportivos de corrida de rua. Gere APENAS código HTML+CSS inline completo para um post ${w}x${h}px profissional. Sem explicações, sem markdown, apenas o HTML puro começando com <div. Use object-fit:contain em imagens para não cortar personagens.`,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    const data = await response.json()
    if (!data.content?.[0]?.text) {
      throw new Error('Resposta inválida da IA: ' + JSON.stringify(data))
    }

    let html = data.content[0].text.trim()
    html = html.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

    return new Response(JSON.stringify({ html, width: w, height: h }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
