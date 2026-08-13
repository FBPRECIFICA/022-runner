-- apply_coupon_to_registration era SECURITY DEFINER sem checar dono da inscricao,
-- e liberada pra role anon: qualquer um (logado ou nao) podia aplicar cupom na
-- inscricao de outra pessoa e reescrever o valor cobrado dela.
--
-- Correcao: so bloqueia quando a inscricao TEM dono e quem chama nao e ele.
-- Inscricao orfa (guest checkout legado, ainda sem conta) continua liberada por
-- quem tem o link, mesmo padrao de acesso ja usado em get_registration_public.
--
-- IS DISTINCT FROM (nao !=) e obrigatorio aqui: auth.uid() e NULL pra chamada
-- anonima, e "x != NULL" sempre avalia NULL (nunca TRUE) em SQL, entao "!=" teria
-- deixado passar exatamente o caso que devia bloquear (inscricao com dono, sem
-- login). Pego e corrigido em teste antes do deploy final.

CREATE OR REPLACE FUNCTION public.apply_coupon_to_registration(p_registration_id uuid, p_code text)
 RETURNS TABLE(ok boolean, message text, discount_amount numeric, base_amount numeric, platform_fee numeric, total_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c coupons%ROWTYPE;
  reg registrations%ROWTYPE;
  v_discount numeric;
  v_base numeric;
  v_fee numeric;
  v_price numeric;
BEGIN
  SELECT * INTO reg FROM registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Inscricao nao encontrada.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  IF reg.user_id IS NOT NULL AND reg.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, 'Voce nao tem permissao para aplicar cupom nesta inscricao.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  SELECT * INTO c FROM coupons WHERE upper(code) = upper(p_code) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom invalido.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  IF c.active IS FALSE THEN
    RETURN QUERY SELECT false, 'Cupom inativo.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  IF c.valid_until IS NOT NULL AND c.valid_until < now() THEN
    RETURN QUERY SELECT false, 'Cupom expirado.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.current_uses >= c.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  IF c.event_id IS NOT NULL AND c.event_id != reg.event_id THEN
    RETURN QUERY SELECT false, 'Cupom nao valido para este evento.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric;
    RETURN;
  END IF;

  v_price := COALESCE(reg.registration_type_price, reg.distance_price, reg.amount, 0);

  IF c.discount_type = 'fixed' THEN
    v_discount := LEAST(c.discount_value, v_price);
  ELSE
    v_discount := ROUND(v_price * (c.discount_value / 100.0), 2);
  END IF;

  v_base := v_price - v_discount;
  v_fee := ROUND(v_price * 0.10, 2);

  UPDATE registrations
  SET coupon_code = upper(p_code),
      discount_amount = v_discount,
      base_amount = v_base,
      platform_fee = v_fee,
      amount = v_base + v_fee
  WHERE id = p_registration_id;

  RETURN QUERY SELECT true, 'Cupom aplicado com sucesso.', v_discount, v_base, v_fee, v_base + v_fee;
END;
$function$;
