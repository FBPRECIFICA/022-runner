# Landing animada — decisões (branch `landing-animada`)

- **Reversão**: tag `pre-landing-animada` (e812ba1b) = home de antes. Sem precisar
  de deploy de tag: `NEW_FRONT_ENABLED = false` em `homeFlags.ts` volta a
  `HomePageClassic` (código antigo, intacto em `pages/HomePage.tsx`).
- **Isolamento**: tudo em `src/components/home/`. `EventCard`, `SecuritySeal` e
  `HeroSection` originais não foram tocados (aparecem em /eventos, /busca,
  rodapé e pagamento). Cópias só da home: `HomeEventCard`, `HomeSecuritySeal`,
  `HomeHero`.
- **Sem biblioteca nova**: a skill AntiSlopUI (`.claude/skills/antislopui`)
  sugere GSAP/Lenis/Motion; não usados. Rolagem = 1 listener com rAF gravando
  `--p` no hero; entradas = IntersectionObserver; só `transform`/`opacity`.
  `prefers-reduced-motion` desliga pin, parallax, linhas e entradas.
- **Ajustes**: `HERO_INTENSITY` (0 a 2) em `homeFlags.ts`.
- **Dados**: nenhuma escrita e nenhuma consulta nova. Contador de eventos =
  eventos publicados já carregados; inscrições confirmadas = soma da RPC
  `get_events_confirmed_counts` que a home já chamava. Cadastros: visitante
  deslogado não lê `users` (RLS) → `REGISTERED_USERS_COUNT` fica null e o
  contador não aparece.
- **Vagas**: "Restam N vagas" = `max_participants − confirmados` (mesma regra
  que fecha as inscrições). Sem limite cadastrado → nada; sem vaga → nada.
- **Identidade**: preto #000, dourado #C9A84C, azul do selo, fonte e logo
  atuais. Easing único `cubic-bezier(0.16, 1, 0.3, 1)`.
