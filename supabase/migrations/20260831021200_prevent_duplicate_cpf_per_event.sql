-- Corrige a causa raiz da duplicidade de inscrições por CPF (achado na
-- investigação "Corrida Solidária — 7 pares duplicados", 2026-08-26/30).
--
-- Causa raiz 1: a checagem de CPF duplicado em RegistrationPage.tsx
-- (handleTermoAccepted) rodava ANTES do login/conta, usando a sessão anon —
-- mas `registrations` não tem policy de SELECT pra `anon`, então a checagem
-- sempre voltava vazia pra qualquer visitante não autenticado, mesmo com uma
-- inscrição confirmada já existindo pro mesmo CPF+evento. RPC abaixo, no
-- padrão já usado por get_registration_public/get_event_confirmed_count,
-- devolve só o mínimo necessário (id/status/asaas_payment_id) sem abrir SELECT
-- direto na tabela pra anon (que exporia nome/telefone/email de qualquer
-- inscrito pra quem soubesse um CPF).
create or replace function public.check_cpf_registration(p_event_id uuid, p_cpf text)
returns table(id uuid, status text, asaas_payment_id text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select id, status, asaas_payment_id
  from registrations
  where event_id = p_event_id
    and cpf = p_cpf
    and status <> 'cancelled'
  limit 1;
$$;

grant execute on function public.check_cpf_registration(uuid, text) to anon, authenticated;

-- Causa raiz 2: nada no banco impedia duas inscrições com o mesmo CPF no
-- mesmo evento — a checagem acima sempre foi só client-side. Trava
-- permanente aqui, valendo pra todos os eventos (não só a Corrida
-- Solidária). Cancelada não conta (permite recadastro depois de cancelar,
-- igual ao comportamento atual do app).
--
-- Excludes abaixo por id: 13 pares que já existiam ANTES dessa trava e a
-- violam (7 na Corrida Solidária, já reportados ao Leandro pra decisão de
-- qual cancelar; mais 1 par pendente na Arena MMP e 5 pares no Balneário Run,
-- achados só agora ao levantar todo o histórico pra essa migration não
-- quebrar — ainda não investigados a fundo, ninguém cancelou nada). Cada
-- exclusão é só o registro MAIS NOVO do par: o mais antigo continua coberto
-- pelo índice, então uma 3ª tentativa pro mesmo CPF já seria bloqueada dora
-- em diante. Depois que cada par for resolvido (o duplicado cancelado), a
-- exceção correspondente fica inerte — pode sair numa limpeza futura, não é
-- urgente.
create unique index registrations_event_cpf_unique_idx
  on registrations (event_id, cpf)
  where status <> 'cancelled'
    and id not in (
      -- Corrida Solidária (evento a75e39c3-2eff-45b8-89db-d27e90c51af8)
      '5be6e997-d967-4eda-a1d8-0987109a377c',
      '24f680b3-c93c-41c4-99a4-a81e3ce4e599',
      '233abac7-c39c-4a77-8769-2c28ae7e2956',
      'a468f856-f7d4-4473-9f33-f0e295085b7d',
      'ac4dd0c4-1fcd-4060-81ef-f2716f2d5332',
      '156d4c39-d99a-481f-a9e4-a296e37005ae',
      '24a7aa2f-447d-47fe-b49b-d2a754a71e9d',
      -- Arena MMP (evento f5b7e2de-e3c3-42f5-a2b0-f3a709247edd), status pending
      '0bab99f1-6d68-44e8-b087-002aefd61af7',
      -- Balneário Run (evento fa9e580b-3a7b-4dac-9e75-287c0b76ef54), status pending/paid
      'b7197f45-7f0a-4621-9564-008e302f3db6',
      '2f7ff01c-e8ee-4d55-bf36-ec811af1fabf',
      'de6e3ce2-dccd-4c83-8619-d69050ed4853',
      '9a5a9c47-1a07-43ef-bf1b-29849e456568',
      'e2c06f03-5d1d-480b-a81e-4a5230d3bd00'
    );
