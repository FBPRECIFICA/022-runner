-- A policy "Inscricoes anonimas visiveis por id" liberava SELECT em qualquer
-- registro com user_id NULL para o role anon sem nenhum filtro por id, permitindo
-- listar todas as inscricoes orfas em massa via REST (nao so consultar uma que ja
-- se sabe o id). Substitui por uma funcao SECURITY DEFINER que exige o id exato
-- como parametro, preservando o acesso legitimo (link de pagamento/confirmacao/
-- certificado por quem tem o uuid, e o dono autenticado) sem permitir enumeracao.

CREATE OR REPLACE FUNCTION public.get_registration_public(p_id uuid)
RETURNS SETOF registrations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM registrations
  WHERE id = p_id
    AND (user_id IS NULL OR user_id = auth.uid())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_registration_public(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Inscricoes anonimas visiveis por id" ON public.registrations;
