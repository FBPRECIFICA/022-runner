-- Pedidos do Leandro pós-Arena MMP (28/09/2026).

-- ITEM 3 — Nº de peito só quando a inscrição fica paga/confirmada.
-- Antes: BEFORE INSERT sempre, então pendente que nunca pagou também queimava número.
-- Agora dispara no INSERT (evento gratuito já nasce 'confirmed') e no UPDATE de status
-- (asaas-webhook -> 'paid', cupom cortesia -> 'confirmed'). Inscrições que já têm número
-- (inclusive as 149 pendentes antigas) não mudam.
create or replace function public.fn_auto_registration_number()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_counter integer;
begin
  if new.status not in ('paid', 'confirmed', 'presente')
     or coalesce(new.registration_number, '') <> '' then
    return new;
  end if;

  -- UPDATE adquire lock exclusivo na linha do evento, serializando inscrições simultâneas
  update events
     set registration_counter = registration_counter + 1
   where id = new.event_id
  returning registration_counter into v_counter;

  new.registration_number := lpad(v_counter::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists trg_auto_registration_number on public.registrations;
create trigger trg_auto_registration_number
  before insert or update of status on public.registrations
  for each row execute function public.fn_auto_registration_number();

-- Cancelada não volta a ser paga sozinha. O asaas-webhook faz UPDATE status='paid' sem
-- olhar o status atual: um PAYMENT_RECEIVED tardio (cartão liquida ~30 dias depois do
-- CONFIRMED) reviveria uma inscrição que o organizador cancelou. Nome com "0" pra rodar
-- antes dos outros triggers BEFORE (ordem alfabética) — capacidade/nº de peito já veem
-- o status mantido como 'cancelled'.
create or replace function public.fn_keep_cancelled_registration()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'cancelled' and new.status in ('paid', 'confirmed', 'presente') then
    new.status := old.status;
    new.paid_at := old.paid_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_0_keep_cancelled_registration on public.registrations;
create trigger trg_0_keep_cancelled_registration
  before update of status on public.registrations
  for each row execute function public.fn_keep_cancelled_registration();

-- ITEM 1 — Organizador cancela inscrição do próprio evento (estorno feito no Asaas).
-- RPC em vez de policy UPDATE: policy liberaria o organizador a mudar qualquer coluna
-- (status pra 'paid', amount...). Pendente com cobrança Asaas viva NÃO passa por aqui —
-- o painel usa a Edge Function cancel-pending-payment, que anula a cobrança antes.
create or replace function public.organizer_cancel_registration(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_reg registrations%rowtype;
begin
  select r.* into v_reg from registrations r join events e on e.id = r.event_id
   where r.id = p_id and (e.organizer_id = auth.uid() or is_admin());
  if not found then
    raise exception 'Inscrição não encontrada ou não pertence aos seus eventos.';
  end if;
  if v_reg.status = 'cancelled' then
    raise exception 'Essa inscrição já está cancelada.';
  end if;
  if v_reg.status = 'pending' and v_reg.asaas_payment_id is not null then
    raise exception 'Inscrição pendente com cobrança Asaas em aberto — use o cancelamento de pendente.';
  end if;

  update registrations set status = 'cancelled' where id = p_id;
end;
$$;

-- ITEM 2 — Transferir titularidade: mesma linha, mesmo nº de peito/kit/valor pago.
-- Só campos de identificação do atleta. Nascimento e sexo entram porque definem a faixa
-- etária/categoria da premiação — manter os do titular antigo classificaria errado.
create or replace function public.organizer_transfer_registration(
  p_id uuid, p_name text, p_cpf text, p_email text, p_phone text,
  p_birth_date date, p_gender text, p_shirt_size text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if coalesce(trim(p_name), '') = '' or coalesce(regexp_replace(p_cpf, '\D', '', 'g'), '') = '' then
    raise exception 'Nome e CPF são obrigatórios.';
  end if;

  update registrations r
     set name = trim(p_name), full_name = trim(p_name),
         cpf = regexp_replace(p_cpf, '\D', '', 'g'), document = regexp_replace(p_cpf, '\D', '', 'g'),
         email = nullif(trim(p_email), ''),
         phone = nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), ''),
         birth_date = p_birth_date,
         gender = nullif(p_gender, ''),
         shirt_size = case when r.shirt_size is null then null else nullif(p_shirt_size, '') end
    from events e
   where r.id = p_id and e.id = r.event_id and r.status <> 'cancelled'
     and (e.organizer_id = auth.uid() or is_admin());
  if not found then
    raise exception 'Inscrição não encontrada, cancelada ou não pertence aos seus eventos.';
  end if;
end;
$$;

revoke all on function public.organizer_cancel_registration(uuid) from public, anon;
revoke all on function public.organizer_transfer_registration(uuid, text, text, text, text, date, text, text) from public, anon;
grant execute on function public.organizer_cancel_registration(uuid) to authenticated;
grant execute on function public.organizer_transfer_registration(uuid, text, text, text, text, date, text, text) to authenticated;

-- ITEM 4 — Instruções de retirada de kit por evento (antes o e-mail dizia fixo
-- "No dia do evento: chegue 30 minutos antes", e no Arena MMP o kit foi entregue na véspera).
alter table public.events add column if not exists kit_pickup_instructions text;
