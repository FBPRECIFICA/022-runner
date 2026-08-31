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

Existe uma branch Supabase de staging (projeto pai `adorzqjhazsfvbttlfht`, branch atual
`htlephpyypvkelorahex` — ligada sob demanda, tem custo por hora, então crie quando for testar
algo arriscado e pode deletar depois com o MCP do Supabase). Qualquer migração de banco ou
mudança em trigger/Edge Function que mexa em auth/pagamento/schema core deve ser testada ali
primeiro, não direto em produção. Mudança cosmética/UI não precisa desse rito.

**Se criar uma branch nova e ela cair em `MIGRATIONS_FAILED`:** o histórico de migrations rastreadas
(`supabase_migrations.schema_migrations`) só ficou completo depois da migration `20260101000000_baseline_schema_reconstructed`
(ver `supabase/migrations/`), que reconstrói o schema anterior ao rastreamento. Se esse arquivo
sumir da tabela de tracking em produção por algum motivo, `list_branches` vai mostrar
`MIGRATIONS_FAILED` de novo — confira `list_migrations` no branch recém-criado e os logs
`postgres_logs` desse branch (via `query_logs`) pra ver em qual statement travou, não assuma
que é o conteúdo da mudança que você acabou de fazer.

## Fonte única de comissão — SEMPRE usar a coluna `platform_fee` gravada, nunca recalcular

A regra de cálculo (fixada em 11/08/2026, confirmada correta em 17/08/2026) é: taxa de
plataforma = sempre 10% sobre o valor ORIGINAL da inscrição (antes de cupom), nunca sobre o
valor pós-desconto. Essa regra só vale pra calcular e GRAVAR `platform_fee` na CRIAÇÃO da
inscrição (`RegistrationPage.tsx`). Para EXIBIR comissão em qualquer relatório/dashboard,
some sempre a coluna `registrations.platform_fee` já gravada — nunca recalcule pela fórmula
atual em cima de inscrições existentes. `platform_fee` é o valor real cobrado do atleta no
momento daquela inscrição (inclusive `0` em inscrições anteriores à existência da comissão
separada, ou um valor menor em cupons usados antes de 11/08/2026 quando a fórmula vigente na
época era 10% pós-desconto) — recalcular pela fórmula de hoje sobre dado histórico produz um
número que nunca foi dinheiro real. **Incidente 31/08/2026:** exatamente esse erro em
`AdminDashboard.tsx` (`platformRevenue` do Overview e `evComissao` da tabela "Comissão por
Evento", ambos usando `platformFeeFromOriginal` sobre todo o histórico) inflou a comissão
exibida do Arena MMP em R$52,38 (29 inscrições) e do Balneário Run em R$19,20 (5 inscrições),
fazendo a conta manual "Bruto − Comissão" parecer maior que o "Est. a Receber" real do
Organizador — que nunca teve esse bug, pois sempre usou `platform_fee` gravado via
`netForOrganizer`. Corrigido: ambos os pontos do Admin agora somam `platform_fee` direto,
igual ao Organizador. Notion: "URGENTE — 022RUNNERS: Auditoria Arena MMP — Valores Não Fecham".
`PaymentPage.tsx` também nem recalcula — só confia na coluna já gravada, mesmo padrão.

**Nota sobre "Bruto":** o termo é usado com DOIS significados diferentes no sistema — não é
bug, mas gera confusão se não for explicitado em qualquer relatório: (1) "Total Cobrado do
Atleta" = `amount` = `base_amount + platform_fee` (dinheiro real que passou pelo Asaas); (2)
"Bruto do Organizador" (usado nos cards do Admin) = `base_amount` só, SEM a comissão (que é
cobrada à parte do atleta e nunca é dinheiro do organizador). As duas definições conciliam
exatamente: `amount − platform_fee = base_amount`, e `base_amount − taxas_asaas = líquido do
organizador` (a comissão nunca entra nessa segunda conta, se cancela por desenho). Em PDF de
auditoria pro organizador, usar a definição (1) como "Bruto" é mais intuitivo — deixa claro
que a comissão nunca foi dinheiro dele.

## Backlog de achados não é pra ser esquecido

Se uma auditoria ou investigação encontrar um bug de prioridade "Médio"/"Baixa" que não vai ser
corrigido na hora, registrar no Notion não é suficiente — precisa ter dono e prazo de revisão,
ou ele fica esquecido até virar reclamação de cliente de novo (foi exatamente o caso do bug de
check-in sobrescrevendo status de pagamento: diagnosticado em 12/08, só corrigido em 17/08
depois de um cliente reclamar).
