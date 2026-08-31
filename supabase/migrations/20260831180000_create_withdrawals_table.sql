-- Aba de Saques (organizador + Admin). Ver Notion "URGENTE — 022RUNNERS: Aba de
-- Saque no Painel + PDF de Auditoria Atualizado (Balneário Run)", id 3cda776f-0069-8146-a0d5-fc37ecbb3bf9.
-- Registra saques já pagos ao organizador, pra o saldo disponível (Total Líquido
-- Confirmado - Total Já Sacado) parar de existir só na cabeça do Leandro.
create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  amount numeric not null check (amount > 0),
  withdrawn_at date not null,
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists withdrawals_event_id_idx on withdrawals(event_id);

alter table withdrawals enable row level security;

-- Mesmo padrão de event_distances/registration_types: organizador enxerga via
-- join em events.organizer_id, sem duplicar organizer_id na tabela.
create policy "Organizadores veem saques dos próprios eventos"
  on withdrawals for select
  using (exists (select 1 from events where events.id = withdrawals.event_id and events.organizer_id = auth.uid()));

-- Saque é dinheiro saindo de verdade — só Admin registra, organizador só lê.
create policy "Admin gerencia todos os saques"
  on withdrawals for all
  using (is_admin())
  with check (is_admin());

-- Registro retroativo do saque de R$1.522,07 feito em 24/08/2026 pro organizador
-- do Balneário Run (event_id fa9e580b-3a7b-4dac-9e75-287c0b76ef54), sem o qual o
-- saldo disponível ficaria errado (mostraria o líquido cheio, já sacado).
-- created_by = c55f16b1-4a2d-41d1-af7b-cfc5d2bb6d4b (único usuário com role='admin' hoje).
insert into withdrawals (event_id, amount, withdrawn_at, note, created_by)
values (
  'fa9e580b-3a7b-4dac-9e75-287c0b76ef54',
  1522.07,
  '2026-08-24',
  'Registro retroativo — saque feito por Leandro fora do sistema, antes de existir esta aba.',
  'c55f16b1-4a2d-41d1-af7b-cfc5d2bb6d4b'
);
