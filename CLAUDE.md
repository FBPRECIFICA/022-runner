# 022RUNNERS — regras de processo (leia antes de mexer em auth/pagamento/banco)

Plataforma em produção, com atletas pagando de verdade. Entre 11/08 e 17/08/2026 tivemos 16
incidentes em produção, vários deles causados por uma correção que quebrou outro fluxo que
ninguém pensou em re-testar. Histórico completo: página Notion "PRIORIDADE ESTRATÉGICA —
022RUNNERS: Por Que Erros Se Repetem + Mudança de Processo". As regras abaixo existem pra isso
não se repetir — não são burocracia, cada uma corresponde a um incidente real que ela teria
evitado.

## Checklist obrigatório de "raio de impacto"

Antes de alterar qualquer um destes, **liste todo fluxo que usa esse código e re-teste TODOS
antes de considerar concluído — não só o fluxo que motivou a mudança**:

- Qualquer trigger em `auth.users` (ex: `handle_new_auth_user`) → re-testar cadastro por senha
  E login/cadastro Google, não só o que motivou a mudança. (Foi exatamente aqui que o cadastro
  ficou 100% quebrado por ~42h em 15-17/08: um trigger corrigido só pro fluxo Google, nunca
  re-testado no fluxo por senha, tinha um `RETURN` faltando que derrubava toda inscrição nova.)
- `AuthContext.tsx` → re-testar login por senha, login Google, sessão persistida, logout.
- `create-payment`/`asaas-webhook` (Edge Functions) → re-testar PIX e cartão, com e sem cupom,
  E verificar o status da assinatura do webhook direto na API da Asaas depois de qualquer
  sequência de falha (`GET /v3/webhooks/{id}` — a Asaas pausa automaticamente e não avisa).
- Qualquer migração de schema em tabela usada por múltiplas páginas (`registrations`,
  `event_distances`, `registration_types`) → testar TODAS as páginas que leem/escrevem essa
  tabela, deslogado como usuário real, não só como admin.
- Módulos de cálculo financeiro (`src/lib/asaasFee.ts`, taxa de plataforma 10%,
  `apply_coupon_to_registration`) → ver seção "Fonte única de comissão" abaixo antes de tocar.

## Staging antes de produção

Existe uma branch Supabase de staging (`dczdybbmzkysojufydkm`, ligada sob demanda — tem custo
por hora, então crie quando for testar algo arriscado e pode deletar depois). Qualquer migração
de banco ou mudança em trigger/Edge Function que mexa em auth/pagamento/schema core deve ser
testada ali primeiro, não direto em produção. Mudança cosmética/UI não precisa desse rito.

## Fonte única de comissão — NÃO está quebrado hoje, não "corrigir" sem motivo

A regra vigente (fixada em 11/08/2026, confirmada correta em 17/08/2026) é: taxa de plataforma
= sempre 10% sobre o valor ORIGINAL da inscrição (antes de cupom), nunca sobre o valor pós-
desconto. Isso já está correto e consistente em `RegistrationPage.tsx` (onde `platform_fee` é
calculado e gravado na criação) e em `AdminDashboard.tsx` (duas exibições, mesma fórmula).
`PaymentPage.tsx` nem recalcula — só confia na coluna `platform_fee` já gravada. Se for
consolidar a fórmula duplicada num helper único (`asaasFee.ts`), é refatoração de
duplicação — o resultado numérico tem que ficar IDÊNTICO ao atual, teste isso explicitamente
antes de considerar concluído.

## Backlog de achados não é pra ser esquecido

Se uma auditoria ou investigação encontrar um bug de prioridade "Médio"/"Baixa" que não vai ser
corrigido na hora, registrar no Notion não é suficiente — precisa ter dono e prazo de revisão,
ou ele fica esquecido até virar reclamação de cliente de novo (foi exatamente o caso do bug de
check-in sobrescrevendo status de pagamento: diagnosticado em 12/08, só corrigido em 17/08
depois de um cliente reclamar).
