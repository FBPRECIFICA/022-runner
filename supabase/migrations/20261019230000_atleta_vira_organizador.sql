-- Atleta pode virar organizador (pedido 19/10/2026 — PEDIDO_CODE_ATLETA_VIRA_ORGANIZADOR.md)
--
-- Ajustes em relação ao rascunho 20261019_atleta_vira_organizador.sql:
-- * NÃO recria handle_new_auth_user nem cria um 2º trigger em auth.users: produção já tem
--   on_auth_user_created -> handle_new_auth_user (mesma lógica + EXCEPTION unique_violation,
--   que o rascunho removeria e voltaria a derrubar signup Google de e-mail duplicado).
-- * Backfill com ON CONFLICT DO NOTHING: leandrotaxi2010@hotmail.com tem auth.users sem
--   perfil mas o e-mail já existe em public.users com outro id (users_email_key) — sem isso a
--   migration inteira falha.
-- * become_organizer() não estoura unique_violation nesse mesmo caso; devolve erro legível.

-- 1) Backfill de quem está sem perfil
insert into public.users (id, email, name, role)
select a.id, a.email,
       coalesce(nullif(a.raw_user_meta_data->>'full_name',''), nullif(a.raw_user_meta_data->>'name',''), split_part(a.email,'@',1)),
       'athlete'
from auth.users a
where not exists (select 1 from public.users u where u.id = a.id)
on conflict do nothing;

-- 2) Qualquer atleta (ou conta sem perfil) vira organizador; admin/organizer não são alterados
create or replace function public.become_organizer()
returns text language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select role into v_role from public.users where id = auth.uid();
  if v_role is null then
    insert into public.users (id, email, name, role)
    select a.id, a.email,
           coalesce(nullif(a.raw_user_meta_data->>'full_name',''), nullif(a.raw_user_meta_data->>'name',''), split_part(a.email,'@',1)),
           'organizer'
    from auth.users a where a.id = auth.uid()
    on conflict do nothing;
    if not found then
      raise exception 'email_ja_vinculado: este e-mail ja esta ligado a outra conta';
    end if;
    return 'organizer';
  elsif v_role = 'athlete' then
    update public.users set role = 'organizer' where id = auth.uid();
    return 'organizer';
  end if;
  return v_role;
end $$;
revoke all on function public.become_organizer() from public, anon;
grant execute on function public.become_organizer() to authenticated;

-- 3) Trava: ninguém se promove a admin sozinho (a policy de UPDATE/INSERT do próprio perfil
--    não restringe a coluna role)
create or replace function public.guard_user_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' and new.role not in ('athlete','organizer') then
      raise exception 'role nao permitido';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      if not ((old.role = 'athlete' and new.role = 'organizer') or (old.role = 'organizer' and new.role = 'athlete')) then
        raise exception 'alteracao de role nao permitida';
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists guard_user_role_trg on public.users;
create trigger guard_user_role_trg before insert or update of role on public.users
for each row execute function public.guard_user_role();

-- 4) André (entrou por Google, queria ser organizador)
update public.users set role = 'organizer' where id = '128ccb37-9bd8-4211-b86e-1fc0036b9485';
