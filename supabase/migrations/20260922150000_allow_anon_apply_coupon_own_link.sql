-- Incidente 22/09/2026 (Notion "URGÊNCIA MÁXIMA — 022RUNNERS: Cupons Dando
-- Inválido pra Vários Clientes"): apply_coupon_to_registration bloqueava
-- QUALQUER visitante anônimo com "Você não tem permissão para aplicar cupom
-- nesta inscrição" -- mesmo na própria inscrição dele. A checagem de dono
-- (migration 20260812223000_apply_coupon_owner_check.sql) só previa dois
-- casos: dono logado (auth.uid() = reg.user_id, permite) ou outra pessoa
-- logada tentando mexer numa inscrição alheia (bloqueia) -- não previa o
-- caso "visitante anônimo na própria inscrição", que não existia até a
-- correção de 31/08/2026 (get_registration_public passou a permitir
-- "Continuar Pagamento da Pendente" pra quem não está logado). Desde então
-- PaymentPage é uma tela alcançável por link, sem login, mas essa função
-- continuava exigindo login -- todo cupom aplicado por alguém sem sessão
-- ativa (link de pagamento salvo, sessão expirada, etc.) dava esse erro,
-- não específico de nenhum cupom (confirmado com BOB10 e AMIGOARENA).
--
-- Correção: só bloqueia quando as DUAS pontas têm identidade e são
-- diferentes (auth.uid() IS NOT NULL E diferente do dono) -- preserva a
-- proteção original contra um usuário logado mexer na inscrição de outro,
-- e alinha com o mesmo modelo de acesso "por link" já usado em
-- get_registration_public (leitura) e cancel-pending-payment (cancelamento,
-- sem checagem de dono nenhuma).

CREATE OR REPLACE FUNCTION public.apply_coupon_to_registration(p_registration_id uuid, p_code text)
 RETURNS TABLE(ok boolean, message text, discount_amount numeric, base_amount numeric, platform_fee numeric, total_amount numeric, confirmed boolean)
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
  v_confirmed boolean;
BEGIN
  SELECT * INTO reg FROM registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Inscricao nao encontrada.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF reg.user_id IS NOT NULL AND auth.uid() IS NOT NULL AND reg.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, 'Voce nao tem permissao para aplicar cupom nesta inscricao.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF reg.status NOT IN ('pending', 'awaiting_payment') THEN
    RETURN QUERY SELECT false, 'Essa inscricao nao esta mais aguardando pagamento.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF reg.elderly_discount THEN
    RETURN QUERY SELECT false, 'Desconto de idoso 60+ (Lei 10.741/2003, Art. 23) ja aplicado e nao pode ser combinado com cupom.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  SELECT * INTO c FROM coupons WHERE upper(code) = upper(p_code) LIMIT 1;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Cupom invalido.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF c.active IS FALSE THEN
    RETURN QUERY SELECT false, 'Cupom inativo.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF c.valid_until IS NOT NULL AND c.valid_until < now() THEN
    RETURN QUERY SELECT false, 'Cupom expirado.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.current_uses >= c.max_uses THEN
    RETURN QUERY SELECT false, 'Cupom esgotado.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF c.event_id IS NOT NULL AND c.event_id != reg.event_id THEN
    RETURN QUERY SELECT false, 'Cupom nao valido para este evento.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  v_price := COALESCE(reg.registration_type_price, reg.distance_price, reg.amount, 0);

  IF c.discount_type = 'fixed' THEN
    v_discount := LEAST(c.discount_value, v_price);
  ELSE
    v_discount := ROUND(v_price * (c.discount_value / 100.0), 2);
  END IF;

  v_base := v_price - v_discount;
  IF v_base <= 0 THEN
    v_fee := 0;
  ELSE
    v_fee := ROUND(v_price * 0.10, 2);
  END IF;

  v_confirmed := (v_base + v_fee) = 0;

  UPDATE registrations
  SET coupon_code = upper(p_code),
      discount_amount = v_discount,
      base_amount = v_base,
      platform_fee = v_fee,
      amount = v_base + v_fee,
      status = CASE WHEN v_confirmed THEN 'confirmed' ELSE status END
  WHERE id = p_registration_id;

  IF v_confirmed THEN
    UPDATE coupons SET current_uses = COALESCE(current_uses, 0) + 1 WHERE id = c.id;
  END IF;

  RETURN QUERY SELECT true, 'Cupom aplicado com sucesso.', v_discount, v_base, v_fee, v_base + v_fee, v_confirmed;
END;
$function$;
