-- Organizador corrige dados digitados errado pelo atleta (pedido do Leandro, 12/10/2026).
-- Mesmo padrão de organizer_cancel/transfer_registration: RPC security definer + rastro em
-- registration_manual_actions, sem policy de UPDATE em registrations (policy liberaria
-- status/amount/cpf). Lista fechada de campos; CPF/distância/titular continuam sendo
-- "Transferir", dinheiro e pagamento não se editam. Não toca no Asaas.

alter table public.registration_manual_actions drop constraint if exists registration_manual_actions_action_check;
alter table public.registration_manual_actions
  add constraint registration_manual_actions_action_check check (action in ('cancel', 'transfer', 'edit'));

create or replace function public.organizer_edit_registration(p_id uuid, p_changes jsonb, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_allowed constant text[] := array['name', 'phone', 'birth_date', 'gender', 'email', 'shirt_size', 'city',
                                     'team_name', 'emergency_contact', 'blood_type', 'medical_condition'];
  v_reg registrations%rowtype;
  v_new registrations%rowtype;
  v_bad text[];
  v_key text;
  v_val text;
  v_date date;
  v_before jsonb := '{}';
  v_after jsonb := '{}';
  v_stock integer;
  v_used integer;
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'Alterações inválidas.';
  end if;

  select array_agg(k) into v_bad from jsonb_object_keys(p_changes) k where k <> all (v_allowed);
  if v_bad is not null then
    raise exception 'Campo(s) não editável(is): %. CPF, distância ou titular: use Transferir. Valores e pagamento não se editam.',
      array_to_string(v_bad, ', ');
  end if;

  select r.* into v_reg from registrations r join events e on e.id = r.event_id
   where r.id = p_id and (e.organizer_id = auth.uid() or is_admin())
   for update of r;
  if not found then
    raise exception 'Inscrição não encontrada ou não pertence aos seus eventos.';
  end if;
  if v_reg.status = 'cancelled' then
    raise exception 'Inscrição cancelada não pode ser editada.';
  end if;

  v_new := v_reg;
  for v_key, v_val in select key, nullif(btrim(value #>> '{}'), '') from jsonb_each(p_changes) loop
    case v_key
      when 'name' then
        if v_val is null then raise exception 'Nome não pode ficar vazio.'; end if;
        v_new.name := v_val;
        v_new.full_name := v_val;
      when 'phone' then
        v_val := regexp_replace(coalesce(v_val, ''), '\D', '', 'g');
        if length(v_val) < 10 or length(v_val) > 13 then
          raise exception 'Telefone inválido. Informe com DDD (mínimo 10 dígitos).';
        end if;
        v_new.phone := v_val;
      when 'birth_date' then
        begin
          v_date := v_val::date;
        exception when others then
          raise exception 'Data de nascimento inválida.';
        end;
        if v_date is null or v_date > current_date or v_date < date '1900-01-01' then
          raise exception 'Data de nascimento inválida (não pode ser futura nem anterior a 1900).';
        end if;
        v_new.birth_date := v_date;
      when 'gender' then
        if v_val is null or v_val not in ('M', 'F', 'O') then
          raise exception 'Sexo inválido (use M, F ou O).';
        end if;
        v_new.gender := v_val;
      when 'email' then
        v_val := lower(coalesce(v_val, ''));
        -- Mesma regra estrutural de src/lib/emailValidation.ts (o front ainda sugere correção de provedor).
        if v_val !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' or v_val like '%..%'
           or split_part(split_part(v_val, '@', 2), '.', -1) in ('c', 'con', 'comc', 'co', 'cm', 'vom', 'om', 'coml') then
          raise exception 'E-mail inválido.';
        end if;
        v_new.email := v_val;
      when 'shirt_size' then
        if v_reg.shirt_size is null or v_reg.shirt_size = '' then
          raise exception 'Essa inscrição não inclui camisa.';
        end if;
        -- Tamanhos do formulário (P/M/G/GG) + qualquer tamanho com estoque cadastrado no evento.
        if v_val is null or (v_val not in ('P', 'M', 'G', 'GG')
           and not exists (select 1 from shirt_stock s where s.event_id = v_reg.event_id and s.size = v_val)) then
          raise exception 'Tamanho de camisa inexistente: %.', coalesce(v_val, '(vazio)');
        end if;
        -- Não estoura o estoque do tamanho novo (mesma conta de get_shirt_availability).
        if v_val <> v_reg.shirt_size and v_reg.status in ('paid', 'confirmed', 'presente') then
          select quantity_total into v_stock from shirt_stock where event_id = v_reg.event_id and size = v_val;
          if v_stock is not null then
            select count(*) into v_used from registrations
             where event_id = v_reg.event_id and shirt_size = v_val and status in ('paid', 'confirmed');
            if v_used >= v_stock then
              raise exception 'Tamanho % esgotado (% de % já usados).', v_val, v_used, v_stock;
            end if;
          end if;
        end if;
        v_new.shirt_size := v_val;
      when 'city' then v_new.city := v_val;
      when 'team_name' then v_new.team_name := v_val;
      when 'emergency_contact' then v_new.emergency_contact := v_val;
      when 'blood_type' then v_new.blood_type := v_val;
      when 'medical_condition' then v_new.medical_condition := v_val;
    end case;
  end loop;

  -- Só o que de fato mudou entra no update e no log.
  foreach v_key in array v_allowed loop
    if (to_jsonb(v_reg) -> v_key) is distinct from (to_jsonb(v_new) -> v_key) then
      v_before := v_before || jsonb_build_object(v_key, to_jsonb(v_reg) -> v_key);
      v_after := v_after || jsonb_build_object(v_key, to_jsonb(v_new) -> v_key);
    end if;
  end loop;
  if v_after = '{}' then
    return jsonb_build_object('changed', false);
  end if;

  update registrations
     set name = v_new.name, full_name = v_new.full_name, phone = v_new.phone, birth_date = v_new.birth_date,
         gender = v_new.gender, email = v_new.email, shirt_size = v_new.shirt_size, city = v_new.city,
         team_name = v_new.team_name, emergency_contact = v_new.emergency_contact,
         blood_type = v_new.blood_type, medical_condition = v_new.medical_condition
   where id = p_id;

  insert into registration_manual_actions (registration_id, event_id, action, actor_id, note, details)
  values (p_id, v_reg.event_id, 'edit', auth.uid(), nullif(trim(p_note), ''),
          jsonb_build_object('before', v_before, 'after', v_after,
                             'registration_number', v_reg.registration_number, 'name', v_reg.name));

  return jsonb_build_object('changed', true, 'before', v_before, 'after', v_after);
end;
$$;

revoke all on function public.organizer_edit_registration(uuid, jsonb, text) from public, anon;
grant execute on function public.organizer_edit_registration(uuid, jsonb, text) to authenticated;
