-- Virada de lote automática + estoque de camisetas no servidor
-- Notion: "EXECUÇÃO — BLOCO 022RUNNERS: Virada de Lote Automática + Estoque de
-- Camisetas (organizador configura sozinho)" (04/11/2026).
--
-- Antes: registration_types.lots era só guardado; o navegador mandava o preço
-- (sempre o 1º lote) e o banco aceitava. Rústica Força Total vendeu a 16ª do
-- Kit Econômico 5 km a R$ 59,90 com o 1º lote (15) já fechado.
--
-- Agora a fonte da verdade do preço é registration_types.lots, calculado aqui:
--  * vagas ocupadas de um kit = inscrições pagas/confirmadas + pendentes
--    criadas por esta regra com reserva ainda válida (lot_held_until, 30 min,
--    o mesmo tempo do cronômetro da tela de pagamento);
--  * lote vigente = primeiro lote cujo acumulado ainda tem vaga;
--  * a inscrição criada pelo site recebe o preço do lote no banco, com lock por
--    kit (duas compras simultâneas da última vaga: a 2ª vai pro lote seguinte);
--  * pendente criada por esta regra, ao pagar depois da reserva vencer, é
--    repreçada se o lote virou (refresh_pending_lot_price, chamado pelo
--    create-payment). Inscrições antigas (lot_number NULL) NUNCA são tocadas.

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS lot_number integer,
  ADD COLUMN IF NOT EXISTS lot_held_until timestamptz;

COMMENT ON COLUMN public.registrations.lot_number IS
  'Lote do kit em que a inscrição foi precificada (1 = 1º lote). NULL = inscrição anterior à virada automática, nunca repreçada.';
COMMENT ON COLUMN public.registrations.lot_held_until IS
  'Até quando esta pendente segura a vaga do lote (conta como ocupada no cálculo do lote).';

CREATE INDEX IF NOT EXISTS registrations_type_status_idx
  ON public.registrations (registration_type_id, status);

-- ---------------------------------------------------------------------------
-- Estado do lote de um kit. p_exclude = inscrição que não deve contar como
-- ocupando vaga (a própria pendente sendo repreçada).
CREATE OR REPLACE FUNCTION public.kit_lot_state(p_type_id uuid, p_exclude uuid DEFAULT NULL)
RETURNS TABLE(
  lot_number integer, lot_count integer, lot_price numeric, lot_remaining integer,
  sold integer, held integer, capacity integer, sold_out boolean, next_price numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_type_price numeric;
  v_lots jsonb;
  v_sold integer;
  v_held integer;
  v_used integer;
  v_n integer;
  v_i integer;
  v_qty integer;
  v_cum integer := 0;
  v_cap integer := 0;
BEGIN
  SELECT rt.price, rt.lots INTO v_type_price, v_lots FROM registration_types rt WHERE rt.id = p_type_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) FILTER (WHERE r.status IN ('paid', 'confirmed', 'presente')),
         count(*) FILTER (WHERE r.status = 'pending' AND r.lot_held_until > now())
    INTO v_sold, v_held
    FROM registrations r
   WHERE r.registration_type_id = p_type_id
     AND (p_exclude IS NULL OR r.id <> p_exclude);
  v_used := v_sold + v_held;

  SELECT COALESCE(jsonb_agg(l ORDER BY o), '[]'::jsonb) INTO v_lots
    FROM jsonb_array_elements(COALESCE(v_lots, '[]'::jsonb)) WITH ORDINALITY AS x(l, o)
   WHERE NULLIF(l->>'price', '') IS NOT NULL;
  v_n := jsonb_array_length(v_lots);

  -- Kit sem lotes configurados: preço único, sem limite.
  IF v_n = 0 THEN
    RETURN QUERY SELECT 1, 1, COALESCE(v_type_price, 0), NULL::integer, v_sold, v_held, NULL::integer, false, NULL::numeric;
    RETURN;
  END IF;

  -- Capacidade total só existe se todos os lotes têm vagas definidas.
  FOR v_i IN 0 .. v_n - 1 LOOP
    v_qty := NULLIF(v_lots->v_i->>'qty', '')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN v_cap := NULL; EXIT; END IF;
    v_cap := v_cap + v_qty;
  END LOOP;

  FOR v_i IN 0 .. v_n - 1 LOOP
    v_qty := NULLIF(v_lots->v_i->>'qty', '')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      -- Lote sem limite de vagas: vale até o fim.
      RETURN QUERY SELECT v_i + 1, v_n, (v_lots->v_i->>'price')::numeric, NULL::integer,
        v_sold, v_held, v_cap, false, NULL::numeric;
      RETURN;
    END IF;
    v_cum := v_cum + v_qty;
    IF v_used < v_cum THEN
      RETURN QUERY SELECT v_i + 1, v_n, (v_lots->v_i->>'price')::numeric, v_cum - v_used,
        v_sold, v_held, v_cap, false,
        CASE WHEN v_i + 1 < v_n THEN (v_lots->(v_i + 1)->>'price')::numeric END;
      RETURN;
    END IF;
  END LOOP;

  -- Todos os lotes esgotados.
  RETURN QUERY SELECT v_n, v_n, (v_lots->(v_n - 1)->>'price')::numeric, 0, v_sold, v_held, v_cap, true, NULL::numeric;
END;
$$;

REVOKE ALL ON FUNCTION public.kit_lot_state(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kit_lot_state(uuid, uuid) TO service_role;

-- Leitura pública por evento (tela do evento, inscrição, pagamento, painel).
CREATE OR REPLACE FUNCTION public.get_event_kit_lots(p_event_id uuid)
RETURNS TABLE(
  registration_type_id uuid, lot_number integer, lot_count integer, lot_price numeric,
  lot_remaining integer, sold integer, capacity integer, sold_out boolean, next_price numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rt.id, s.lot_number, s.lot_count, s.lot_price, s.lot_remaining, s.sold, s.capacity, s.sold_out, s.next_price
    FROM registration_types rt
    CROSS JOIN LATERAL public.kit_lot_state(rt.id) s
   WHERE rt.event_id = p_event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_kit_lots(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Inscrição criada pelo site (anon/authenticated): preço, status e lote vêm
-- daqui, nunca do navegador. Inserts feitos por funções SECURITY DEFINER
-- (organizador transferindo inscrição etc.) e service role não passam por aqui.
-- Nome com "trg_a_" pra rodar antes dos triggers de número/capacidade.
CREATE OR REPLACE FUNCTION public.price_registration_from_kit_lot(NEW public.registrations)
RETURNS public.registrations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_kit registration_types%ROWTYPE;
  v_event_date timestamp;
  v_st record;
  v_list numeric;
  v_base numeric;
  v_fee numeric;
  v_elderly boolean;
  v_stock integer;
  v_shirt_sold integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('kit_lot:' || NEW.registration_type_id::text, 0));

  SELECT * INTO v_kit FROM registration_types WHERE id = NEW.registration_type_id;
  IF NOT FOUND OR v_kit.event_id IS DISTINCT FROM NEW.event_id THEN
    RAISE EXCEPTION 'Kit inválido para este evento.';
  END IF;

  SELECT * INTO v_st FROM public.kit_lot_state(NEW.registration_type_id);
  IF v_st.sold_out THEN
    RAISE EXCEPTION 'Esgotado — as vagas deste kit acabaram.';
  END IF;

  IF NOT COALESCE(v_kit.includes_shirt, true) THEN
    NEW.shirt_size := NULL;
  ELSIF NEW.shirt_size IS NOT NULL THEN
    SELECT quantity_total INTO v_stock FROM shirt_stock
     WHERE event_id = NEW.event_id AND size = NEW.shirt_size;
    IF v_stock IS NOT NULL THEN
      SELECT count(*) INTO v_shirt_sold FROM registrations
       WHERE event_id = NEW.event_id AND shirt_size = NEW.shirt_size AND status IN ('paid', 'confirmed', 'presente');
      IF v_shirt_sold >= v_stock THEN
        RAISE EXCEPTION 'O tamanho % esgotou. Escolha outro tamanho.', NEW.shirt_size;
      END IF;
    END IF;
  END IF;

  -- Idoso 60+ na data do evento (Lei 10.741/2003, Art. 23): 50%, comissão sobre o
  -- valor já com desconto — mesma regra do RegistrationPage, agora no servidor.
  SELECT date INTO v_event_date FROM events WHERE id = NEW.event_id;
  v_elderly := NEW.birth_date IS NOT NULL AND v_event_date IS NOT NULL
    AND date_part('year', age(v_event_date::date, NEW.birth_date)) >= 60;

  v_list := COALESCE(v_st.lot_price, 0);
  v_base := CASE WHEN v_elderly THEN round(v_list * 0.5, 2) ELSE v_list END;
  v_fee := round(v_base * 0.10, 2);

  NEW.registration_type_name := v_kit.name;
  NEW.registration_type_price := v_list;
  NEW.distance_price := NULL;
  NEW.base_amount := v_base;
  NEW.platform_fee := v_fee;
  NEW.discount_amount := v_list - v_base;
  NEW.elderly_discount := v_elderly;
  NEW.amount := v_base + v_fee;
  NEW.coupon_code := NULL;
  NEW.status := CASE WHEN v_base = 0 THEN 'confirmed' ELSE 'pending' END;
  NEW.lot_number := v_st.lot_number;
  NEW.lot_held_until := CASE WHEN v_base = 0 THEN NULL ELSE now() + interval '30 minutes' END;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.price_registration_from_kit_lot(public.registrations) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.price_registration_from_kit_lot(public.registrations) TO anon, authenticated, service_role;

-- O trigger em si roda como quem chamou (SECURITY INVOKER): só assim current_user
-- é 'anon'/'authenticated' num insert vindo do site — dentro de função SECURITY
-- DEFINER (RPCs do organizador) é o dono da função, e esses inserts ficam de fora.
CREATE OR REPLACE FUNCTION public.apply_kit_lot_on_insert()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') OR NEW.registration_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  RETURN public.price_registration_from_kit_lot(NEW);
END;
$$;

DROP TRIGGER IF EXISTS trg_a_apply_kit_lot ON public.registrations;
CREATE TRIGGER trg_a_apply_kit_lot
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION public.apply_kit_lot_on_insert();

-- ---------------------------------------------------------------------------
-- Pendente criada pela regra nova, na hora de pagar: se a reserva venceu e o
-- lote virou, recalcula (mantendo cupom/idoso) e avisa. Chamado pelo
-- create-payment antes de gerar a cobrança.
CREATE OR REPLACE FUNCTION public.refresh_pending_lot_price(p_registration_id uuid)
RETURNS TABLE(changed boolean, sold_out boolean, old_amount numeric, new_amount numeric, lot_number integer, lot_price numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  reg registrations%ROWTYPE;
  c coupons%ROWTYPE;
  v_st record;
  v_list numeric;
  v_disc numeric := 0;
  v_base numeric;
  v_fee numeric;
BEGIN
  SELECT * INTO reg FROM registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF reg.status <> 'pending' OR reg.lot_number IS NULL OR reg.registration_type_id IS NULL THEN
    RETURN QUERY SELECT false, false, reg.amount, reg.amount, reg.lot_number, reg.registration_type_price;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('kit_lot:' || reg.registration_type_id::text, 0));
  SELECT * INTO reg FROM registrations WHERE id = p_registration_id FOR UPDATE;

  IF reg.lot_held_until > now() THEN
    RETURN QUERY SELECT false, false, reg.amount, reg.amount, reg.lot_number, reg.registration_type_price;
    RETURN;
  END IF;

  SELECT * INTO v_st FROM public.kit_lot_state(reg.registration_type_id, p_registration_id);
  IF v_st.sold_out THEN
    RETURN QUERY SELECT false, true, reg.amount, reg.amount, reg.lot_number, reg.registration_type_price;
    RETURN;
  END IF;

  v_list := v_st.lot_price;
  IF v_list = reg.registration_type_price THEN
    UPDATE registrations SET lot_number = v_st.lot_number, lot_held_until = now() + interval '30 minutes'
     WHERE id = p_registration_id;
    RETURN QUERY SELECT false, false, reg.amount, reg.amount, v_st.lot_number, v_list;
    RETURN;
  END IF;

  IF reg.elderly_discount THEN
    v_base := round(v_list * 0.5, 2);
    v_fee := round(v_base * 0.10, 2);
    v_disc := v_list - v_base;
  ELSE
    IF reg.coupon_code IS NOT NULL THEN
      SELECT * INTO c FROM coupons WHERE upper(code) = upper(reg.coupon_code) LIMIT 1;
      IF FOUND THEN
        v_disc := CASE WHEN c.discount_type = 'fixed' THEN LEAST(c.discount_value, v_list)
                       ELSE round(v_list * (c.discount_value / 100.0), 2) END;
      END IF;
    END IF;
    v_base := v_list - v_disc;
    v_fee := CASE WHEN v_base <= 0 THEN 0 ELSE round(v_list * 0.10, 2) END;
  END IF;

  UPDATE registrations
     SET registration_type_price = v_list,
         base_amount = v_base,
         platform_fee = v_fee,
         discount_amount = v_disc,
         amount = v_base + v_fee,
         lot_number = v_st.lot_number,
         lot_held_until = now() + interval '30 minutes'
   WHERE id = p_registration_id;

  RETURN QUERY SELECT true, false, reg.amount, v_base + v_fee, v_st.lot_number, v_list;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_pending_lot_price(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_pending_lot_price(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Organizador não pode deixar menos vagas no kit do que já foi vendido.
CREATE OR REPLACE FUNCTION public.guard_kit_lots_capacity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_sold integer;
  v_cap integer := 0;
  l jsonb;
  v_qty integer;
BEGIN
  IF NEW.lots IS NOT DISTINCT FROM OLD.lots THEN RETURN NEW; END IF;
  FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.lots, '[]'::jsonb)) LOOP
    IF NULLIF(l->>'price', '') IS NULL THEN CONTINUE; END IF;
    v_qty := NULLIF(l->>'qty', '')::integer;
    IF v_qty IS NULL OR v_qty <= 0 THEN RETURN NEW; END IF;  -- algum lote sem limite
    v_cap := v_cap + v_qty;
  END LOOP;
  IF v_cap = 0 THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_sold FROM registrations
   WHERE registration_type_id = NEW.id AND status IN ('paid', 'confirmed', 'presente');
  IF v_cap < v_sold THEN
    RAISE EXCEPTION '% (%): os lotes somam % vagas, mas % já foram vendidas. Aumente as vagas.',
      NEW.name, (SELECT name FROM event_distances WHERE id = NEW.distance_id), v_cap, v_sold;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_kit_lots_capacity ON public.registration_types;
CREATE TRIGGER trg_guard_kit_lots_capacity
BEFORE UPDATE OF lots ON public.registration_types
FOR EACH ROW EXECUTE FUNCTION public.guard_kit_lots_capacity();

-- ---------------------------------------------------------------------------
-- events.distances (jsonb legado) vira só um espelho dos kits, usado pelos cards
-- (faixa de preço) e pela validação de cupom em valor fixo. Fonte única =
-- registration_types.lots. price = menor preço vigente entre os kits da distância.
CREATE OR REPLACE FUNCTION public.sync_event_distances_cache(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_cache jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
           'name', d.name,
           'price', COALESCE(
              (SELECT min(s.lot_price) FROM registration_types rt CROSS JOIN LATERAL public.kit_lot_state(rt.id) s
                WHERE rt.distance_id = d.id AND NOT s.sold_out),
              (SELECT min(rt.price) FROM registration_types rt WHERE rt.distance_id = d.id), 0),
           'includes_shirt', COALESCE((SELECT bool_or(rt.includes_shirt) FROM registration_types rt WHERE rt.distance_id = d.id), true),
           'lots', COALESCE((SELECT jsonb_agg(jsonb_build_object('price', (l->>'price')::numeric, 'qty', NULL))
                               FROM registration_types rt, jsonb_array_elements(COALESCE(rt.lots, '[]'::jsonb)) l
                              WHERE rt.distance_id = d.id AND NULLIF(l->>'price', '') IS NOT NULL), '[]'::jsonb)
         ) ORDER BY d.sort_order)
    INTO v_cache
    FROM event_distances d
   WHERE d.event_id = p_event_id
     AND EXISTS (SELECT 1 FROM registration_types rt WHERE rt.distance_id = d.id);

  IF v_cache IS NULL THEN RETURN; END IF;  -- evento sem kits: mantém o que tem
  UPDATE events SET distances = v_cache WHERE id = p_event_id AND distances IS DISTINCT FROM v_cache;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_event_distances_cache(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_event_distances_cache(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_sync_event_distances_cache()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Espelho de exibição: nunca pode derrubar a operação principal (ex.: o
  -- webhook marcando uma inscrição como paga).
  BEGIN
    IF TG_TABLE_NAME = 'registration_types' THEN
      PERFORM public.sync_event_distances_cache(COALESCE(NEW.event_id, OLD.event_id));
    ELSE
      PERFORM public.sync_event_distances_cache(NEW.event_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_event_distances_cache falhou: %', SQLERRM;
  END;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_distances_cache_kits ON public.registration_types;
CREATE TRIGGER trg_sync_distances_cache_kits
AFTER INSERT OR UPDATE OR DELETE ON public.registration_types
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_event_distances_cache();

DROP TRIGGER IF EXISTS trg_sync_distances_cache_regs ON public.registrations;
CREATE TRIGGER trg_sync_distances_cache_regs
AFTER UPDATE OF status ON public.registrations
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.registration_type_id IS NOT NULL
      AND NEW.status IN ('paid', 'confirmed', 'cancelled'))
EXECUTE FUNCTION public.trg_sync_event_distances_cache();

-- Alinha o espelho dos eventos ainda não realizados (passados ficam como estão).
SELECT public.sync_event_distances_cache(e.id)
  FROM events e
 WHERE e.date >= now() - interval '1 day' AND e.archived_at IS NULL;
