-- registrations tinha ZERO policy de UPDATE que permitisse a um organizador marcar
-- checkin_at na própria inscrição do seu evento (só existia UPDATE pra "usuário
-- cancela a própria pendente" e o ALL de admin). O UPDATE que CheckinPage.tsx sempre
-- fez direto na tabela, como sessão do organizador, sempre casava 0 linhas por RLS —
-- e um UPDATE que casa 0 linhas por RLS NÃO retorna erro no Supabase/PostgREST, só
-- "sucesso" com nada afetado. A UI local (estado otimista em handleCheckin) sempre
-- mostrou "Presente" mesmo assim, escondendo que nada nunca foi gravado. Confirmado
-- em produção (04/09/2026) que os 567 registros da 1º Corrida Solidária tinham
-- checkin_at NULL apesar de Leandro reportar ter marcado check-in o dia inteiro.
--
-- RPC SECURITY DEFINER (mesmo padrão de check_cpf_registration/get_shirt_availability)
-- em vez de política de UPDATE direta, porque RLS não restringe coluna-a-coluna:
-- sem isso, dar UPDATE geral ao organizador também abriria a porta pra ele alterar
-- status/amount/outros campos financeiros da própria inscrição.
create or replace function public.mark_registration_checkin(p_registration_id uuid)
returns registrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reg registrations;
begin
  select * into v_reg from registrations where id = p_registration_id;
  if v_reg.id is null then
    raise exception 'Inscrição não encontrada';
  end if;

  if not (
    is_admin()
    or exists (
      select 1 from events e
      where e.id = v_reg.event_id and e.organizer_id = auth.uid()
    )
  ) then
    raise exception 'Sem permissão para confirmar check-in nesta inscrição';
  end if;

  update registrations
    set checkin_at = coalesce(checkin_at, now())
    where id = p_registration_id
    returning * into v_reg;

  return v_reg;
end;
$$;

grant execute on function public.mark_registration_checkin(uuid) to authenticated;
