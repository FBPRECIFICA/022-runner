-- Auditoria final Arena MMP (23/09/2026): o painel não enxergava dois custos reais que só
-- aparecem no extrato Asaas, então o "Líquido do Organizador" ficava maior que o real.
--   asaas_anticipation_fee: RECEIVABLE_ANTICIPATION_FEE do extrato (antecipação de cartão) —
--     nunca entra no netValue da cobrança.
--   refunded_amount: valor devolvido ao atleta em estorno. A inscrição vira 'cancelled', mas
--     continua na conta de dinheiro (isFinancialRow em src/lib/asaasFee.ts), porque as taxas
--     Asaas da transação original não são devolvidas.
-- Aditivo, default 0: nenhum evento existente muda de valor até alguém preencher essas colunas.
-- Preenchimento dos dados da Arena MMP fica fora daqui (script em auditoria/), pra não quebrar
-- branches de staging (ver incidente da migration de withdrawals).
alter table public.registrations
  add column if not exists asaas_anticipation_fee numeric not null default 0,
  add column if not exists refunded_amount numeric not null default 0;
