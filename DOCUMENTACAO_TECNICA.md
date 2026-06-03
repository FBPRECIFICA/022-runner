# 022 RUNNER — Documentação Técnica

## Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS v4
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Deploy**: Vercel (branch `main`)
- **Libs**: react-router-dom, react-leaflet, recharts, qrcode.react, react-hot-toast, i18next, xlsx, swiper

## Variáveis de Ambiente
Copie `.env.example` para `.env.local`:
```
VITE_MERCADOPAGO_PUBLIC_KEY=
VITE_MERCADOPAGO_ACCESS_TOKEN=
VITE_RESEND_API_KEY=
VITE_STRAVA_CLIENT_ID=
VITE_STRAVA_CLIENT_SECRET=
```

## Como Rodar Localmente
```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # build de produção
npx vitest run    # rodar testes
```

## Estrutura de Pastas
```
src/
  components/   # Componentes reutilizáveis
  pages/        # Páginas (roteadas)
  contexts/     # AuthContext
  lib/          # supabase.ts, utils.ts
  services/     # mercadopago.ts, emailService.ts, stravaService.ts
  utils/        # validators.ts, analytics.ts, scoreCalculator.ts, whatsappNotifier.ts
  i18n/         # Arquivos de tradução
  __tests__/    # Testes Vitest
public/
  images/       # Logo e imagens estáticas
  manifest.json # PWA manifest
  sw.js         # Service Worker
```

## Tabelas Supabase
| Tabela | Descrição |
|--------|-----------|
| `users` | Perfis dos usuários |
| `events` | Eventos esportivos |
| `registrations` | Inscrições em eventos |
| `reviews` | Avaliações de eventos |
| `favorites` | Eventos favoritados |
| `newsletter` | Cadastros na newsletter |
| `coupons` | Cupons de desconto |
| `notifications` | Notificações internas |
| `event_photos` | Galeria pós-evento |
| `teams` | Equipes esportivas |
| `team_members` | Membros das equipes |
| `audit_logs` | Logs de auditoria |

## Fluxo de Inscrição
1. Atleta acessa `/evento/:slug`
2. Clica em "INSCREVER-SE" → `/inscricao/:eventSlug`
3. Preenche formulário → salva em `registrations` (status: `pending`)
4. Redireciona para `/pagamento/:registrationId`
5. Paga via PIX (real: Mercado Pago / simulado: botão)
6. Status muda para `confirmed`
7. Redireciona para `/confirmacao/:registrationId`
8. E-mail de confirmação enviado (Resend)

## Fluxo de Check-in
1. Organizador acessa `/checkin/:eventSlug`
2. Busca atleta por nome ou nº de inscrição
3. Clica em "Check-in" → `checkin_at` preenchido no Supabase

## Roles
- `athlete`: acessa `/atleta`, faz inscrições
- `organizer`: acessa `/organizador`, cria/gerencia eventos
- `admin`: acessa `/admin`, painel completo

## Changelog
- **v1.0** — MVP: eventos, inscrições, mapa
- **v2.0** — Admin, PIX, certificado, QR Check-in
- **v3.0** — Redesign dourado, PWA, SEO, analytics
- **v4.0** — Avaliações, newsletter, busca, equipes, i18n, testes
