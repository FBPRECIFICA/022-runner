-- Cupom 100% cortesia (Notion: "EXECUÇÃO — 022RUNNERS: Cupom 100% Cortesia +
-- Lista de Conferência por Cupom"). Pedido do Leandro: cupom de 100% de
-- desconto pra patrocinadores/políticos, pulando pagamento (Asaas) quando o
-- valor final zera — mesma lógica já usada pro evento gratuito.
--
-- Conflito encontrado com a regra vigente (fixada 11/08, "Fonte única de
-- comissão" no CLAUDE.md): taxa de plataforma sempre 10% sobre o valor
-- ORIGINAL, nunca sobre o pós-cupom. Aplicada ao pé da letra, um cupom de
-- 100% zera a base mas ainda cobra a taxa (ex: R$10 numa inscrição de R$100)
-- — não fica de fato grátis. Exceção explícita SÓ pro caso em que a base já
-- zerou: aí a taxa some junto e a inscrição confirma direto, igual a um
-- evento gratuito. Qualquer cupom parcial continua com a regra de sempre,
-- sem nenhuma mudança.
--
-- Gap achado que o pedido não menciona: coupons.current_uses só incrementa
-- dentro do asaas-webhook (pagamento real confirmado). Uma cortesia nunca
-- passa pelo webhook, então incrementamos aqui manualmente — senão um cupom
-- "só 5 usos" pra patrocinadores nunca bateria o limite.
--
-- Guard novo: só permite aplicar cupom em inscrição pendente. A função nunca
-- teve essa trava, mas agora que ela também muda `status` (não só valores
-- numéricos), aplicar cupom numa inscrição já cancelada/paga vira um risco
-- novo que não existia antes.
--
-- DROP necessário porque o retorno ganhou uma coluna nova (`confirmed`) — Postgres
-- não permite CREATE OR REPLACE mudar o tipo de retorno de uma função existente.
DROP FUNCTION IF EXISTS public.apply_coupon_to_registration(uuid, text);

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

  IF reg.user_id IS NOT NULL AND reg.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN QUERY SELECT false, 'Voce nao tem permissao para aplicar cupom nesta inscricao.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
    RETURN;
  END IF;

  IF reg.status NOT IN ('pending', 'awaiting_payment') THEN
    RETURN QUERY SELECT false, 'Essa inscricao nao esta mais aguardando pagamento.', NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, false;
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
  -- Taxa some junto quando a base já zerou (cortesia total) — qualquer
  -- desconto parcial mantém a regra de sempre, 10% sobre o valor original.
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

GRANT EXECUTE ON FUNCTION public.apply_coupon_to_registration(uuid, text) TO anon, authenticated;
