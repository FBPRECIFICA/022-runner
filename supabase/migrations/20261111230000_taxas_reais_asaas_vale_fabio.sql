-- Taxas REAIS do Asaas por inscrição + "vale Fábio" (taxa assumida).
-- Notion: "URGENTE — 022RUNNERS: Painel registrar TODAS as taxas reais do Asaas (mensageria +
-- antecipação)" + bloco "CONFIRMADO PELO SR. FÁBIO (11/11/2026)".
-- Só ADICIONA colunas/tabela. Não apaga nada e não altera amount, status, registration_number,
-- asaas_net_value, platform_fee nem saques.

-- 1) Colunas de taxa real (preenchidas pela Edge Function sync-asaas-fees, a partir do extrato).
alter table public.registrations
  add column if not exists asaas_invoice_number   text,
  add column if not exists asaas_payment_fee      numeric,      -- tarifa Pix/cartão
  add column if not exists asaas_messaging_fee    numeric,      -- mensageria (R$ 0,99)
  add column if not exists asaas_notification_fee numeric,      -- WhatsApp (R$ 0,55)
  add column if not exists asaas_other_fee        numeric,      -- chargeback/estorno residual
  add column if not exists asaas_real_net         numeric,      -- o que a cobrança deixou no Asaas (null = não liquidou)
  add column if not exists asaas_settled_at       date,         -- 1ª entrada de dinheiro (recebimento ou antecipação)
  add column if not exists asaas_fees_synced_at   timestamptz,
  -- "vale Fábio": parte das taxas que o Sr. Fábio assume (null = evento sem cobertura)
  add column if not exists covered_fee            numeric,
  -- ajuste manual repassado ao organizador e pago pelo vale (ex.: nº 031 da Rústica, R$ 10,00)
  add column if not exists covered_adjustment     numeric not null default 0,
  add column if not exists covered_note           text;
-- asaas_anticipation_fee já existe (antes só preenchida à mão); a sync passa a gravar o valor real.

-- 2) Quais eventos têm a taxa assumida pelo vale e até quando. Só Admin lê/escreve (o organizador
--    pode editar a própria linha de events, por isso não é coluna de events).
create table if not exists public.fee_coverage_events (
  event_id     uuid primary key references public.events(id),
  covers_until date,             -- inscrições pagas até essa data (null = sem fim)
  covered_by   text not null default 'Fábio',
  note         text,
  created_at   timestamptz not null default now()
);
alter table public.fee_coverage_events enable row level security;
drop policy if exists "Admin gerencia cobertura de taxas" on public.fee_coverage_events;
create policy "Admin gerencia cobertura de taxas" on public.fee_coverage_events
  for all using (is_admin()) with check (is_admin());

-- 3) Ninguém além do servidor (service_role) e do Admin grava essas colunas. A policy de INSERT
--    de registrations é aberta (anon cria inscrição) e o atleta pode atualizar a própria inscrição
--    pendente — sem isso alguém poderia inflar o líquido do organizador.
create or replace function public.protect_asaas_fee_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- auth.role() null = sem JWT (migração / SQL direto no banco): liberado.
  if auth.role() is null or auth.role() = 'service_role' or is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.asaas_invoice_number := null; new.asaas_payment_fee := null; new.asaas_messaging_fee := null;
    new.asaas_notification_fee := null; new.asaas_other_fee := null; new.asaas_real_net := null;
    new.asaas_settled_at := null; new.asaas_fees_synced_at := null; new.covered_fee := null;
    new.covered_adjustment := 0; new.covered_note := null;
  else
    new.asaas_invoice_number := old.asaas_invoice_number; new.asaas_payment_fee := old.asaas_payment_fee;
    new.asaas_messaging_fee := old.asaas_messaging_fee; new.asaas_notification_fee := old.asaas_notification_fee;
    new.asaas_other_fee := old.asaas_other_fee; new.asaas_real_net := old.asaas_real_net;
    new.asaas_settled_at := old.asaas_settled_at; new.asaas_fees_synced_at := old.asaas_fees_synced_at;
    new.covered_fee := old.covered_fee; new.covered_adjustment := old.covered_adjustment;
    new.covered_note := old.covered_note;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_asaas_fee_columns on public.registrations;
create trigger trg_protect_asaas_fee_columns
  before insert or update on public.registrations
  for each row execute function public.protect_asaas_fee_columns();

-- 4) Lançamentos confirmados pelo Sr. Fábio em 11/11/2026 (idempotente).
--    Rústica Força Total e Gaivota Run 2027: taxa assumida em todas as inscrições pagas até a prova.
insert into public.fee_coverage_events (event_id, covers_until, note)
select id, date::date, 'Vale Fábio: mensageria + antecipação + chargeback, inscrições pagas até a prova (decisão 11/11/2026)'
from public.events
where id in ('85d97fe8-e3d6-4159-bdda-a447c084860a', '2d4d7f3e-0c42-4e5b-9db6-609fe060877e')
on conflict (event_id) do nothing;

--    Rústica nº 031: paga a R$ 59,90 em vez de R$ 69,90 (lote); R$ 10,00 repassados à organizadora.
update public.registrations
set covered_adjustment = 10.00,
    covered_note = 'Ajuste de lote (paga R$ 59,90 em vez de R$ 69,90) repassado à organizadora — vale Fábio, 11/11/2026'
where id = 'e7daa555-b078-4930-a99f-b2dc9d791e32'
  and event_id = '85d97fe8-e3d6-4159-bdda-a447c084860a'
  and registration_number = '031'
  and covered_adjustment = 0;
