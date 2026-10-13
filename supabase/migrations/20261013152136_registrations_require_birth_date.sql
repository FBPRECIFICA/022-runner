-- Toda inscrição nova precisa de data de nascimento real (>= 1900, não futura).
-- Motivo: Balneário Run teve 8 inscrições pagas com birth_date NULL — o front gravava
-- `birthdateToISO(...) || null` quando o ano vinha com 2 dígitos ("15/09/19").
--
-- Trigger em vez de CHECK ... NOT VALID (mesmo motivo de registrations_require_email_phone,
-- 20261013010309): NOT VALID só pula as linhas antigas na criação do constraint; depois disso
-- o Postgres revalida a linha inteira em QUALQUER update. As 8 do Balneário Run (e qualquer
-- pendente antiga sem data) passariam a falhar no check-in, cancelamento, reembolso e — o
-- pior — no asaas-webhook marcando 'paid'. O trigger valida só no INSERT e quando birth_date
-- de fato muda, então nenhuma linha existente é alterada nem travada. Sem backfill: as 8 são
-- corrigidas à mão, por contato com os atletas (pelo "Editar dados", que passa por aqui).
create or replace function public.registrations_require_birth_date()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.birth_date is not distinct from old.birth_date then
    return new;
  end if;

  if new.birth_date is null then
    raise exception 'Informe a data de nascimento (dia/mês/ano com 4 dígitos).'
      using errcode = 'check_violation';
  end if;

  -- "Hoje" em Brasília: current_date do servidor é UTC e adiantaria o dia entre 21h e 0h.
  if new.birth_date < date '1900-01-01'
     or new.birth_date > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Data de nascimento inválida (não pode ser futura nem anterior a 1900).'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_registrations_require_birth_date on public.registrations;
create trigger trg_registrations_require_birth_date
  before insert or update of birth_date on public.registrations
  for each row execute function public.registrations_require_birth_date();
