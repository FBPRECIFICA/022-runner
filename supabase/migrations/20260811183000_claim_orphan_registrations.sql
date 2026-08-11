-- Vincula automaticamente, no login, inscricoes feitas como convidado (user_id nulo)
-- ao usuario autenticado quando o e-mail coincide. E-mail e id vem sempre da sessao
-- autenticada (auth.uid()/auth.users), nunca de parametro do cliente, para que um
-- usuario logado nao possa reivindicar inscricoes de outro e-mail.
CREATE OR REPLACE FUNCTION public.claim_orphan_registrations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE registrations
  SET user_id = auth.uid()
  WHERE user_id IS NULL
    AND lower(email) = lower(v_email);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;
