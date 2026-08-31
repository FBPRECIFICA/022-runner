-- get_registration_public existia pra permitir acesso por link (pagamento/
-- confirmacao/certificado) "por quem tem o uuid" (comentario original da
-- migration 20260812220000), mas o WHERE tinha uma trava extra de dono
-- (user_id IS NULL OR user_id = auth.uid()) que nunca foi exercitada ate
-- hoje: toda inscricao nasce com user_id preenchido (proceedToAccountOrFinalize
-- exige login antes de gravar), e ate a fix de hoje (check_cpf_registration)
-- nenhum visitante anonimo descobria o uuid de uma inscricao pendente de
-- outra pessoa mesmo assim. Agora que o fluxo "Continuar Inscricao Pendente"
-- entrega esse uuid pra visitante anonimo (sem logar) e navega direto pra
-- /pagamento/:id, a trava de dono passou a bloquear o proprio fluxo que a
-- CPF-check foi construida pra habilitar -- reproduzido com o caso do Erick
-- Costa dos Santos (registro 4ef37ca3-4d23-4be8-abcf-0eb798fc9b3e, pending,
-- user_id preenchido): "Inscricao nao encontrada" ao clicar continuar sem
-- estar logado como o dono. Alinha o WHERE ao que o comentario original ja
-- dizia: exige o uuid exato (sem enumeracao), sem exigir dono.
create or replace function public.get_registration_public(p_id uuid)
returns setof registrations
language sql
security definer
set search_path = public
as $$
  select * from registrations
  where id = p_id
  limit 1;
$$;
