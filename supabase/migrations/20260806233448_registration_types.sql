-- Tipos de inscrição (kits) por evento — recurso novo, opcional e paralelo ao
-- sistema existente de distância/lote (events.distances[].lots[]), que não é tocado.
CREATE TABLE public.registration_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_registration_types_event_id ON public.registration_types(event_id);

ALTER TABLE public.registration_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tipos de eventos publicados visíveis"
  ON public.registration_types FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = registration_types.event_id AND events.status = 'published'));

CREATE POLICY "Organizadores gerenciam tipos dos próprios eventos"
  ON public.registration_types FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = registration_types.event_id AND events.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = registration_types.event_id AND events.organizer_id = auth.uid()));

CREATE POLICY "Admin gerencia todos tipos de inscrição"
  ON public.registration_types FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- Inscrição do corredor referencia qual tipo foi escolhido (nullable: eventos sem
-- kits continuam sem preencher essas colunas, fluxo idêntico ao atual).
ALTER TABLE public.registrations
  ADD COLUMN registration_type_id uuid REFERENCES public.registration_types(id) ON DELETE SET NULL,
  ADD COLUMN registration_type_name text,
  ADD COLUMN registration_type_price numeric;

-- Cupom passa a preferir o preço do kit quando presente; sem kit, comportamento
-- idêntico ao anterior (registration_type_price nulo cai no fallback de sempre).
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
  v_fee := ROUND(v_base * 0.10, 2);

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
