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

### ITENS PENDENTES PRIORITÁRIOS (para BLOCO 64)

**CRÍTICO:**
1. ❌ **ConfirmationPage.tsx tela branca** — ainda importa `qrcode.react` (linha 6) e usa `[l, v]` (linha 93) — mesmas correções do PaymentPage
2. ❌ **Webhook Asaas (item A)** — verificar coluna `asaas_payment_id` em `registrations`; configurar URL no painel Asaas (manual)
3. ⚠️ **send-email não redeployada** — fazer deploy da Edge Function `send-email`; RESEND_API_KEY precisa estar nas secrets

**ALTA:**
4. ❌ **B — WhatsApp sobrepõe LEO no desktop** — `WhatsAppButton: bottom-6 right-6` vs `ChatBot: bottom:20px right:20px` — separar posições
5. ❌ **15/C — Gerador de posts formato errado** — `htmlToPng` hardcoded 1080×1080; passar `format` e ajustar dimensões por formato (Feed/Stories/WhatsApp)
6. ❌ **12.10 — Botão gerador no OrganizerDashboard** — verificar/adicionar link para `/gerador-social`

**MÉDIA:**
7. ⚠️ **13.11/18 — LEO** — confirmar `ANTHROPIC_API_KEY` nas secrets Supabase
8. ⚠️ **8.6 — Número inscrição** — testável após fluxo completo
9. ⚠️ **Boleto** — testar após PIX validado
