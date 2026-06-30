# HANDOFF 022RUNNERS V6
**Data:** 2026-06-22  
**Último bloco executado:** BLOCO 54  
**Stack:** React 19 + Vite + Tailwind v4 + TypeScript + Supabase + Vercel  

---

## CREDENCIAIS E CONFIGURAÇÕES

### Supabase
- **Project ID:** adorzqjhazsfvbttlfht
- **URL:** https://adorzqjhazsfvbttlfht.supabase.co
- **Anon Key:** sb_publishable_b098wEy_wai6_RWuR5pV7g_IAw-x86p
- **Dashboard:** https://supabase.com/dashboard/project/adorzqjhazsfvbttlfht

### Vercel
- **Projeto:** 022runners
- **URL Produção:** https://022runners.com.br (DNS pendente) / URL Vercel direto
- **Branch deploy:** main (auto-deploy)

### Asaas (Pagamentos)
- **API Key Produção:** (armazenada no Supabase Vault como `ASAAS_API_KEY` e no `.env.local` como `VITE_ASAAS_API_KEY`)
- **Webhook URL:** `https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/asaas-webhook`
- **Taxas:** PIX 0.99%, Cartão 2.99%, Boleto
- **`.env.local`** contém `VITE_ASAAS_API_KEY` (gitignored)

### Resend (Email)
- **API Key:** (armazenada no Supabase Vault como `RESEND_API_KEY`)
- **FROM:** noreply@022runners.com.br
- **Status DNS:** pendente no registro.br

### Anthropic (LEO)
- **API Key:** (armazenada no Supabase Vault como `ANTHROPIC_API_KEY`)
- **Model LEO:** claude-haiku-4-5-20251001
- **Model Gerador Post:** claude-sonnet-4-6

---

## EDGE FUNCTIONS DEPLOYADAS

| Função | Versão | Status |
|--------|--------|--------|
| `ai-assistant` | v11 | ✅ Deployada |
| `generate-post` | v2 | ✅ Deployada |
| `create-payment` | v1 | ✅ Deployada |
| `asaas-webhook` | v2 | ✅ Deployada |
| `send-email` | v1 | ✅ Deployada |

### Secrets a configurar no Supabase Dashboard → Edge Functions → Manage secrets:
- `ANTHROPIC_API_KEY` — chave Anthropic (começa com sk-ant-api03-)
- `RESEND_API_KEY` — chave Resend (começa com re_)
- `ASAAS_API_KEY` — chave Asaas produção (começa com $aact_prod_)

---

## O QUE FOI CONCLUÍDO (BLOCOS 52-54)

### BLOCO 52 — Pagamento Asaas
- [x] Mercado Pago removido completamente
- [x] `src/lib/asaas.ts` — cliente Asaas PIX/Cartão/Boleto
- [x] `src/pages/PaymentPage.tsx` — 3 formas de pagamento com UI completa
  - PIX: QR Code gerado via Edge Function + botão "Já paguei"
  - Cartão: redirect para URL da Asaas
  - Boleto: código de barras + link
  - Countdown de 30 minutos
- [x] `supabase/functions/create-payment` — cria cliente e cobrança na Asaas
- [x] `supabase/functions/asaas-webhook` — recebe confirmação e atualiza status para 'paid'

### BLOCO 53 — Melhorias Gerais
- [x] Login Google temporariamente desabilitado (reativado no BLOCO 54)
- [x] LEO com dados reais dos eventos (`fetchActiveEvents` injeta no system prompt)
- [x] Templates de email Resend (`src/lib/emailTemplates.ts`) — 5 templates
- [x] `supabase/functions/send-email` — disparo via Resend
- [x] Email automático no webhook Asaas (`atleta_confirmacao`)
- [x] Email para organizador em nova inscrição (`organizador_nova_inscricao`)
- [x] Contador de inscritos em tempo real no OrganizerDashboard
- [x] Admin pode excluir eventos (já estava implementado, verificado)

### BLOCO 54 — Verificação Final e Correções
- [x] T1: Google login reativado (botão funcional, provider configurado no Supabase)
- [x] T2: PaymentPage verificada — 3 formas de pagamento OK, botão "Já paguei" no PIX
- [x] T3: ConfirmationPage — número de peito em destaque (fundo escuro #111, dourado #C9A84C, 6xl, "SEU NÚMERO DE PEITO")
- [x] T4: OrganizerDashboard — lista de inscritos expandível por evento (nome, nº peito, categoria, status pagamento)
- [x] T5: CheckinPage — placeholder "Digite o nome ou número de peito", botão "Confirmar Check-in", status muda para "presente"
- [x] T6: AdminDashboard verificado — excluir eventos ✅, todos usuários ✅, todas inscrições ✅
- [x] T7: LEO verificado — busca eventos do Supabase e injeta no prompt ✅
- [x] T8: `npm run build` — zero erros TypeScript, build em 55s ✅
- [x] T10: HANDOFF V6 criado (este arquivo)
- [x] T11: Build + commit + push main

---

## PENDÊNCIAS MANUAIS (não automatizáveis)

### 1. Supabase — Secrets das Edge Functions
Acesse: https://supabase.com/dashboard/project/adorzqjhazsfvbttlfht/functions  
Clique em "Manage secrets" e adicione as 3 chaves listadas acima.

### 2. Vercel — Variável de Ambiente
Acesse o painel Vercel do projeto 022runners.  
Adicione em Settings → Environment Variables:
- `VITE_ASAAS_API_KEY` = (valor da chave Asaas produção)

### 3. Asaas — Configurar Webhook
No painel Asaas, configure o webhook em:
- URL: `https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/asaas-webhook`
- Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED

### 4. DNS 022runners.com.br (registro.br)
- A @ → 216.198.79.1 (Vercel)
- CNAME www → cname.vercel-dns.com

### 5. DNS Resend (022runners.com.br)
- Adicionar os registros TXT/CNAME fornecidos pelo Resend no registro.br
- Aguardar propagação (até 48h)

---

## FLUXO COMPLETO DE INSCRIÇÃO

1. Atleta acessa `/evento/:slug` → clica "Inscrever-se"
2. `/inscricao/:slug` — preenche dados pessoais, seleciona distância/kit
3. Supabase insere `registration` (status: 'pending') + gera `registration_number`
4. Email automático para o organizador (se Resend configurado)
5. Redirect para `/pagamento/:registrationId`
6. PaymentPage — escolhe PIX/Cartão/Boleto
7. `create-payment` Edge Function → cria cobrança na Asaas
8. Asaas envia webhook → `asaas-webhook` → atualiza status para 'paid' → envia email de confirmação
9. Atleta navega para `/confirmacao/:registrationId` — vê número de peito em destaque
10. No dia do evento: organizador acessa `/checkin/:eventSlug` → busca por nome ou nº de peito → "Confirmar Check-in" → status muda para 'presente'

---

## ARQUIVOS PRINCIPAIS MODIFICADOS (BLOCOS 52-54)

```
src/
  pages/
    LoginPage.tsx          — Google reativado
    PaymentPage.tsx        — PIX/Cartão/Boleto Asaas + "Já paguei"
    ConfirmationPage.tsx   — Nº peito com fundo escuro/dourado
    OrganizerDashboard.tsx — Inscritos expandível por evento
    CheckinPage.tsx        — Placeholder, botão, status "presente"
    RegistrationPage.tsx   — Email organizador nova inscrição
  lib/
    asaas.ts               — Cliente Asaas
    emailTemplates.ts      — 5 templates HTML Resend
supabase/functions/
  create-payment/          — Cria cobrança Asaas
  asaas-webhook/           — Webhook confirmação pagamento
  send-email/              — Disparo Resend
  ai-assistant/            — LEO com eventos reais (v11)
  generate-post/           — Gerador post social (v2)
```

---

## PRÓXIMOS PASSOS SUGERIDOS

- [ ] Configurar todas as secrets no Supabase
- [ ] Configurar `VITE_ASAAS_API_KEY` no Vercel
- [ ] Configurar webhook Asaas
- [ ] Verificar DNS 022runners.com.br e Resend
- [ ] Testar fluxo completo com pagamento real
- [ ] Implementar foto/avatar do atleta no check-in
- [ ] Dashboard financeiro para organizadores (relatório de recebimentos)
- [ ] Lembretes automáticos 3 dias antes do evento

---

## DIAGNÓSTICO BLOCO 63 — 2026-06-29

### Último bloco executado: BLOCO 63

### ITENS RESOLVIDOS (BLOCO 62 + BLOCO 63)
- [x] **4.4** — Redirecionamento login: LoginPage com seleção de perfil, validação de role, redirect correto
- [x] **9 — PaymentPage tela branca**: removido `qrcode.react`, corrigido `[l, v]` → `[label, value]`, build limpo
- [x] **9 — Cartão Asaas**: abre link externo — comportamento intencional ✅
- [x] **Status "Cancelado"**: AthleteDashboard mapeia `pending/awaiting_payment` → "Aguardando Pagamento"
- [x] **BLOCO 62**: Edge Functions `create-payment` e `asaas-webhook` redeployadas
- [x] **BLOCO 62**: ErrorBoundary adicionado ao App.tsx; AthleteDashboard com "Verificar status"

### ITENS RESOLVIDOS NO BLOCO 65 — 2026-06-29

- [x] **TAREFA 1/2** — `asaas-webhook` e `create-payment` redeployados. Colunas `asaas_payment_id` e `paid_at` confirmadas existentes.
- [x] **TAREFA 3** — Constraint `registrations_status_check` ampliada para incluir `paid`, `awaiting_payment`, `presente`. Inscrição de "fabio marques alexandre" (pay_8h0dhuupc9whomrl) atualizada para `paid`.
- [x] **TAREFA 4** — `WhatsAppButton.tsx`: posição alterada de `right-6` para `left-6` (canto inferior esquerdo). LEO permanece no canto inferior direito.
- [x] **TAREFA 5** — `generate-post/index.ts`: aceita `format` (feed/stories/whatsapp), gera HTML com dimensões corretas (1080×1080, 1080×1920, 800×800), usa `object-fit:contain`. `postGenerator.ts`: `htmlToPng` aceita `width/height` dinâmicos, passa `format` para a Edge Function. `SocialGeneratorPage.tsx`: passa `format` para `generateEventPost`.
- [x] **TAREFA 6** — OrganizerDashboard já tinha botão `<Link to="/gerador-social">` correto (confirmado na leitura do código).
- [x] **TAREFA 7** — Build limpo, commit `39459810`, push para main. Edge functions `asaas-webhook`, `create-payment`, `generate-post` deployadas.

### ITENS RESOLVIDOS NO BLOCO 66 — 2026-06-30

- [x] **TAREFA 1** — Site URL do Supabase Auth atualizado via Management API para `https://022runners.com.br`. Redirect URLs adicionados: `https://022runners.com.br/**`, `https://www.022runners.com.br/**`.
- [x] **TAREFA 2** — `RegisterPage.tsx`: após cadastro bem-sucedido, exibe tela "Verifique seu e-mail" com o endereço do usuário, aviso de spam e botão "Ir para o Login". Sem redirect automático.
- [x] **TAREFA 3** — Templates de email de Auth atualizados via Management API: assuntos em português ("Confirme seu email — 022RUNNERS", "Recuperar sua senha — 022RUNNERS"), HTML com identidade visual da marca (fundo preto, dourado #C9A84C, logotipo, corpo em PT-BR).
- [x] **TAREFA 4** — `OrganizerDashboard.tsx`: card "Inscritos" agora lê de `allRegistrations.filter(r => r.status !== 'cancelled').length`. Card "Receita" também calculado dinamicamente dos status `paid`/`confirmed`.
- [x] **TAREFA 5** — `ai-assistant`: campo `regulations` já estava na query SELECT. Prompt atualizado para instruir explicitamente o LEO a usar o campo `regulations` ao responder perguntas sobre regras. Redeploy feito.
- [x] **TAREFA 6** — `EventCard.tsx` e `EventDetailPage.tsx`: `object-cover` substituído por `object-cover object-top` para não cortar cabeças nas fotos de banner.
- [x] **TAREFA 7** — Build limpo, commit `d6b91359`, push para main.

### ITENS RESOLVIDOS NO BLOCO 67 — 2026-06-30

- [x] **TAREFA 1** — `send-email` redeployado (RESEND_API_KEY já estava nas secrets). FROM_EMAIL atualizado para `022RUNNERS <noreply@022runners.com.br>` (nome do remetente aparece nos clientes de email).
- [x] **TAREFA 2 — Auditoria Completa do Fluxo:**
  - **ConfirmationPage.tsx CORRIGIDA** — `import { QRCodeSVG } from 'qrcode.react'` REMOVIDO (bug TDZ). QR code substituído por `<img src="https://api.qrserver.com/v1/...">`. `.map(([l, v]) =>` renomeado para `[label, value]` com tipagem `[string, string][]`. Build limpo.
  - **Race condition número de peito CORRIGIDA** — criado trigger Postgres `trg_auto_registration_number` que usa `UPDATE events SET registration_counter = registration_counter + 1` (lock exclusivo da linha) para gerar número atômico. `RegistrationPage.tsx` removido o count client-side. Trigger inicializou contadores de todos os eventos existentes.
  - **Proteção contra inscrição duplicada IMPLEMENTADA** — antes do INSERT, `RegistrationPage.tsx` verifica se mesmo CPF já tem inscrição ativa (não cancelada) no evento. Se sim, bloqueia com mensagem "Este CPF já possui uma inscrição ativa para este evento."
  - **create-payment** — asaas_payment_id salvo corretamente após criação do pagamento. SEGURO.
  - **asaas-webhook** — busca por asaas_payment_id primeiro, fallback por externalReference. SEMPRE retorna HTTP 200 (mesmo no catch). Email de confirmação disparado após payment. SEGURO.
  - **OrganizerDashboard contador** — corrigido no BLOCO 66, dinâmico. SEGURO.
  - **PaymentPage polling** — polling PIX a cada 5s + botão "Já paguei" com query direta ao banco. SEGURO.
  - **Status constraint** — banco aceita: paid, pending, awaiting_payment, cancelled, presente. SEGURO.
  - **Exportação Excel** — `xlsx` instalado, `exportExcel()` gera arquivo com todos os campos. SEGURO.
  - **Cascade delete** — Admin apaga registrations, favorites, reviews, event_photos antes de deletar event. SEGURO.
  - **Check-in** — atualiza `status='presente'` e `checkin_at`. SEGURO.
  - **Login Google** — `signInWithOAuth({ provider: 'google' })` implementado. SEGURO.
- [x] **TAREFA 5** — Build limpo (zero erros TS), commit `93ebb2cf`, push para main.

### PENDENTES PARA BLOCO 68

**MANUAIS OBRIGATÓRIOS (não automatizáveis):**
1. ❌ **Webhook Asaas** — configurar URL no painel Asaas: `https://adorzqjhazsfvbttlfht.supabase.co/functions/v1/asaas-webhook` (eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED)
2. ⚠️ **ANTHROPIC_API_KEY** — confirmar nas secrets Supabase (LEO + gerador de posts)
3. ⚠️ **DNS Resend** — registros TXT/CNAME para `022runners.com.br` no registro.br (sem isso emails chegam como spam ou são rejeitados)
4. ⚠️ **Vercel status** — banner "We are investigating a technical issue" é incidente da infraestrutura Vercel (não relacionado ao código do projeto). Verificar resolução em vercel-status.com.
