-- Rastro de toda ação manual do organizador/admin sobre uma inscrição (pedido do Leandro,
-- 28/09/2026): quem cancelou/transferiu o quê e quando, pra disputa futura. Só se escreve por
-- funções security definer / service role — nenhuma policy de INSERT/UPDATE/DELETE, então nem o
-- organizador consegue apagar ou forjar o próprio histórico.
-- (Confirmação manual de pagamento foi vetada: abriria bypass do Asaas e da comissão.)
create table if not exists public.registration_manual_actions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  action text not null check (action in ('cancel', 'transfer')),
  actor_id uuid not null,
  note text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists registration_manual_actions_registration_idx on public.registration_manual_actions (registration_id);
create index if not exists registration_manual_actions_event_idx on public.registration_manual_actions (event_id, created_at desc);

alter table public.registration_manual_actions enable row level security;

drop policy if exists registration_manual_actions_select on public.registration_manual_actions;
create policy registration_manual_actions_select on public.registration_manual_actions
  for select to authenticated
  using (is_admin() or exists (select 1 from events e where e.id = event_id and e.organizer_id = auth.uid()));

revoke all on public.registration_manual_actions from anon;
grant select on public.registration_manual_actions to authenticated;

-- Cancelar: mesma regra de antes + p_note + log. Assinatura muda (novo parâmetro), então
-- derruba a antiga pra não ficar overload ambíguo no PostgREST.
drop function if exists public.organizer_cancel_registration(uuid);
create or replace function public.organizer_cancel_registration(p_id uuid, p_note text default null)
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

  insert into registration_manual_actions (registration_id, event_id, action, actor_id, note, details)
  values (p_id, v_reg.event_id, 'cancel', auth.uid(), nullif(trim(p_note), ''),
          jsonb_build_object('previous_status', v_reg.status, 'registration_number', v_reg.registration_number,
                             'name', v_reg.name, 'cpf', v_reg.cpf, 'amount', v_reg.amount));
end;
$$;

-- Transferir: mesma regra de antes + p_note + log com titular antigo e novo.
drop function if exists public.organizer_transfer_registration(uuid, text, text, text, text, date, text, text);
create or replace function public.organizer_transfer_registration(
  p_id uuid, p_name text, p_cpf text, p_email text, p_phone text,
  p_birth_date date, p_gender text, p_shirt_size text, p_note text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_old registrations%rowtype;
  v_new registrations%rowtype;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(regexp_replace(p_cpf, '\D', '', 'g'), '') = '' then
    raise exception 'Nome e CPF são obrigatórios.';
  end if;

  select r.* into v_old from registrations r join events e on e.id = r.event_id
   where r.id = p_id and r.status <> 'cancelled' and (e.organizer_id = auth.uid() or is_admin())
   for update of r;
  if not found then
    raise exception 'Inscrição não encontrada, cancelada ou não pertence aos seus eventos.';
  end if;

  update registrations r
     set name = trim(p_name), full_name = trim(p_name),
         cpf = regexp_replace(p_cpf, '\D', '', 'g'), document = regexp_replace(p_cpf, '\D', '', 'g'),
         email = nullif(trim(p_email), ''),
         phone = nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), ''),
         birth_date = p_birth_date,
         gender = nullif(p_gender, ''),
         shirt_size = case when r.shirt_size is null then null else nullif(p_shirt_size, '') end
   where r.id = p_id
  returning r.* into v_new;

  insert into registration_manual_actions (registration_id, event_id, action, actor_id, note, details)
  values (p_id, v_old.event_id, 'transfer', auth.uid(), nullif(trim(p_note), ''),
          jsonb_build_object(
            'registration_number', v_old.registration_number,
            'from', jsonb_build_object('name', v_old.name, 'cpf', v_old.cpf, 'email', v_old.email, 'phone', v_old.phone,
                                       'birth_date', v_old.birth_date, 'gender', v_old.gender, 'shirt_size', v_old.shirt_size),
            'to', jsonb_build_object('name', v_new.name, 'cpf', v_new.cpf, 'email', v_new.email, 'phone', v_new.phone,
                                     'birth_date', v_new.birth_date, 'gender', v_new.gender, 'shirt_size', v_new.shirt_size)));
end;
$$;

revoke all on function public.organizer_cancel_registration(uuid, text) from public, anon;
revoke all on function public.organizer_transfer_registration(uuid, text, text, text, text, date, text, text, text) from public, anon;
grant execute on function public.organizer_cancel_registration(uuid, text) to authenticated;
grant execute on function public.organizer_transfer_registration(uuid, text, text, text, text, date, text, text, text) to authenticated;
