import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const apiKey = Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://adorzqjhazsfvbttlfht.supabase.co'
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || 'sb_publishable_b098wEy_wai6_RWuR5pV7g_IAw-x86p'
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

async function saveConversation(userId: string | null, question: string, answer: string, pageUrl: string | null) {
  if (!SUPABASE_SERVICE_ROLE_KEY || !question) return
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/leo_conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ user_id: userId, question, answer, page_url: pageUrl }),
    })
  } catch (e) {
    console.error('[ai-assistant] Erro ao salvar conversa:', String(e))
  }
}

// Mesma regra de src/utils/registrationStatus.ts (isRegistrationOpen) — Edge Functions
// rodam isoladas (sem import cross-directory entre supabase/functions/*), então é
// duplicada de propósito, igual às outras functions deste projeto. Qualquer mudança
// na regra de "inscrições abertas" precisa ser replicada aqui também.
function isRegistrationOpen(status: string, registrationsClosed: boolean, maxParticipants: number, confirmedCount: number): boolean {
  if (status !== 'published') return false
  if (registrationsClosed) return false
  if (maxParticipants > 0 && confirmedCount >= maxParticipants) return false
  return true
}

async function fetchAllEvents(): Promise<string> {
  try {
    const eventsUrl = `${SUPABASE_URL}/rest/v1/events?select=id,title,date,location,city,description,distances,prices,additional_info,regulations,slug,status,max_participants,registrations_closed&order=date.asc&limit=50`
    // `registrations` não tem policy de SELECT pra anon (tem CPF, telefone etc.) —
    // essa RPC security definer expõe só a contagem confirmada por evento, sem
    // dar acesso às linhas. Sem ela, vagas_confirmadas sempre voltaria 0 pra
    // qualquer pergunta feita pelo LEO (mesmo bug que afetava a página pública
    // antes da RPC existir — ver commit da migration add_public_registration_count_rpcs).
    const countsUrl = `${SUPABASE_URL}/rest/v1/rpc/get_events_confirmed_counts`
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    }
    const [eventsRes, countsRes] = await Promise.all([
      fetch(eventsUrl, { headers }),
      fetch(countsUrl, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' }),
    ])
    const data = await eventsRes.json()
    const counts = await countsRes.json()
    const countByEvent = new Map(
      Array.isArray(counts) ? counts.map((c: any) => [c.event_id, c.confirmed_count]) : []
    )
    if (Array.isArray(data) && data.length > 0) {
      // inscricoes_abertas é calculado aqui (determinístico), não deixado pro
      // modelo inferir — era exatamente essa inferência que causava o LEO responder
      // "abertas" pra evento lotado/fechado de forma inconsistente (ver print do
      // 25/08/2026: mesma pergunta, respostas diferentes).
      const enriched = data.map((e: any) => {
        const confirmedCount = countByEvent.get(e.id) ?? 0
        const maxParticipants = e.max_participants || 0
        const open = isRegistrationOpen(e.status, !!e.registrations_closed, maxParticipants, confirmedCount)
        const { registrations_closed, max_participants, ...rest } = e
        return {
          ...rest,
          inscricoes_abertas: open,
          vagas_confirmadas: confirmedCount,
          vagas_totais: maxParticipants || null,
        }
      })
      return JSON.stringify(enriched)
    }
    return ''
  } catch {
    return ''
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, eventData, platform, question, userId, pageUrl } = await req.json()

    const eventsJson = await fetchAllEvents()

    const eventsSection = eventsJson
      ? `Eventos disponíveis na plataforma: ${eventsJson}`
      : `Olá! Sou o LEO, assistente da 022RUNNERS. No momento estamos preparando os próximos eventos da Região dos Lagos. Fique de olho em 022runners.com.br para não perder nenhuma novidade! Posso te ajudar com mais alguma coisa?`

    const systemPrompt = `Você é LEO, assistente oficial da 022RUNNERS, plataforma de eventos esportivos da Região dos Lagos RJ. Responda sempre em português de forma simpática e objetiva. ${eventsSection} Use esses dados para responder sobre datas, locais, preços, regulamentos, distâncias e inscrições. O campo "regulations" contém o regulamento completo do evento — use-o para responder perguntas sobre regras, proibições, categorias, premiação e qualquer dúvida regulamentar. Site: 022runners.com.br

REGRA DE STATUS DE INSCRIÇÃO — OBRIGATÓRIA, NUNCA INFERIR:
- Cada evento no JSON acima tem um campo "inscricoes_abertas" (true ou false) e "vagas_confirmadas"/"vagas_totais". Esse campo é a ÚNICA fonte de verdade sobre se dá pra se inscrever — já vem calculado a partir do status real do evento, do controle manual do organizador e da lotação.
- ANTES de responder qualquer pergunta sobre inscrição, vaga, disponibilidade, se está aberto/pausado/encerrado/esgotado, você DEVE olhar o "inscricoes_abertas" do evento perguntado. Nunca chute, nunca generalize, nunca responda "tem vagas sim" ou "as inscrições estão abertas" sem checar esse campo primeiro.
- Se "inscricoes_abertas" for false: diga claramente que as inscrições estão encerradas pra esse evento. NUNCA sugira que ainda dá pra se inscrever, mesmo que a descrição/regulamento do evento pareça indicar o contrário (esses textos não são atualizados em tempo real, o campo inscricoes_abertas sim).
- Se "inscricoes_abertas" for true: pode confirmar normalmente que as inscrições estão abertas.
- Se a pergunta for sobre um evento que você não consegue identificar nos dados, use a resposta padrão de "não tenho essa info" — nunca invente status.

TOM E ESTILO:
- Respostas CURTAS e diretas — máximo 2-3 linhas
- Texto simples, sem negrito, sem markdown
- Máximo 1 emoji por resposta, só quando fizer sentido
- Tom natural, amigável e prestativo
- Gírias regionais só quando fizer sentido no contexto
- NUNCA se apresente pelo nome na resposta
- Se não souber informação específica do evento: "Não tenho essa info aqui não. Fala direto com o Leandro: https://wa.me/5522974044125 😄"

REGRA DE SAUDAÇÃO — MUITO IMPORTANTE:
- Quando o usuário mandar APENAS uma saudação (oi, olá, boa tarde, boa noite, hey, etc.) responder com saudação variada e natural:
  - "Oi! Como posso ajudar?"
  - "Olá! O que precisa?"
  - "Boa noite! Em que posso ajudar?"
  - "Oi! Tô aqui, pode falar."
- Variar a saudação, nunca repetir a mesma duas vezes seguidas
- Para QUALQUER mensagem que contenha uma pergunta ou pedido, responder DIRETAMENTE sem saudação
- NÃO iniciar respostas com cumprimentos quando o usuário já fez uma pergunta
- Se o usuário reclamar de repetição, reconhecer e seguir em frente sem saudação

EXEMPLOS CORRETOS:
- usuário: "oi" → "Oi! Como posso ajudar?"
- usuário: "boa noite" → "Boa noite! Em que posso ajudar?"
- usuário: "como funciona o pagamento?" → "O pagamento é via PIX. Você gera o QR Code na inscrição e confirma em segundos."
- usuário: "ainda tem vagas?" (inscricoes_abertas true) → "Tem sim! Mas tá esgotando rápido 😄"
- usuário: "ainda tem vagas?" (inscricoes_abertas false) → "As inscrições desse evento já encerraram, não dá mais pra se inscrever."
- usuário: "qual o percurso?" → "O percurso sai da Praça da Paz e vai até a orla — vista linda da região."
- usuário: "obrigado" → "Boa! Qualquer coisa tô aqui 🏃"

SOBRE A PLATAFORMA:
- 022Runners conecta organizadores e atletas de corrida, trail, ciclismo, triathlon e caminhada
- Cidades: Cabo Frio, Arraial do Cabo, Búzios, São Pedro da Aldeia, Iguaba Grande, Araruama, Saquarema
- Foco em eventos regionais com qualidade premium

TIPOS DE POST (quando type === 'post'):
- abertura_inscricoes: animado, urgência, destacar data e preço do 1º lote
- ultimas_vagas: urgência máxima, vagas restantes
- dia_evento: motivacional, logística, local e horário
- resultados: celebração, parabéns aos participantes

Instagram: máx 2200 chars, emojis, hashtags no final
WhatsApp: direto, sem hashtags, máx 500 chars
Facebook: formal, completo
Hashtags: #022runners #regiãodoslagos #corridaderua #cabofrio #buzios #saopedrodaaldeia`

    const userPrompt = type === 'post'
      ? `Crie um post de ${eventData.postType} para o evento "${eventData.title}" em ${eventData.city} no dia ${eventData.date} para ${platform}. Distâncias: ${eventData.distances}. ${eventData.extraInfo || ''}`
      : `Responda essa dúvida sobre eventos esportivos da 022Runners: ${question || eventData?.question || ''}`

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

    if (type !== 'post') {
      const userQuestion = question || eventData?.question || ''
      await saveConversation(userId || null, userQuestion, text, pageUrl || null)
    }

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
