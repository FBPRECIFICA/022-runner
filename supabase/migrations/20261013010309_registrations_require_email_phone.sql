-- Toda inscrição nova precisa ter e-mail (não vazio, com @) e telefone (≥ 10 dígitos).
--
-- Trigger em vez de CHECK ... NOT VALID: um CHECK NOT VALID pula as linhas antigas
-- só no momento da criação — depois disso o Postgres revalida a linha inteira em
-- QUALQUER update. Em 12/10 eram 6 inscrições fora da regra (nº 091 do Balneário Run sem
-- e-mail nem telefone, paga; nº 132 "...ogmail.com" sem @, confirmada; 127 e 260
-- canceladas, mais 2 sem nº: 1 cancelada e 1 pendente com "&" no lugar do @). Com CHECK, o check-in, o cancelamento ou o reembolso delas passariam
-- a falhar. O trigger valida só no INSERT e quando o e-mail/telefone de fato muda,
-- então essas linhas seguem editáveis e nenhum dado existente é alterado.
create or replace function public.registrations_require_email_phone()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and new.email is not distinct from old.email
     and new.phone is not distinct from old.phone then
    return new;
  end if;

  if coalesce(btrim(new.email), '') = '' or position('@' in new.email) = 0 then
    raise exception 'E-mail inválido. Informe um e-mail válido para concluir a inscrição.'
      using errcode = 'check_violation';
  end if;

  if length(regexp_replace(coalesce(new.phone, ''), '\D', '', 'g')) < 10 then
    raise exception 'Telefone inválido. Informe o telefone com DDD (mínimo 10 dígitos).'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_registrations_require_email_phone on public.registrations;
create trigger trg_registrations_require_email_phone
  before insert or update of email, phone on public.registrations
  for each row execute function public.registrations_require_email_phone();
