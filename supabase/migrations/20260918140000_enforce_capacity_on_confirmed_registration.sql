-- Trava real (banco) pro estoque de camiseta e pro limite geral de vagas do evento
-- (Notion: "URGENTE — 022RUNNERS: Grade de Camisetas Arena MMP Não Limitou
-- Quantidade" + pedido adicional de limite geral de 180 atletas). RegistrationPage.tsx
-- já revalida no submit (get_shirt_availability / get_event_confirmed_count), mas só
-- client-side; este trigger é o backstop atômico contra corrida — ex.: duas
-- inscrições GRATUITAS simultâneas pro mesmo tamanho/evento passando pela mesma
-- checagem client-side antes de qualquer uma terminar de gravar.
--
-- Se aplica a qualquer linha que se TORNA 'confirmed' — INSERT direto já nascendo
-- confirmed (evento gratuito) OU UPDATE de status pending->confirmed (cupom 100%
-- cortesia, apply_coupon_to_registration, zera a base e confirma sem passar pelo
-- Asaas). De propósito NUNCA trava status->'paid' (webhook Asaas confirmando
-- pagamento real): bloquear ali deixaria um atleta que JÁ PAGOU de verdade preso
-- em pending pra sempre — pior que estourar a grade em 1-2 unidades numa corrida
-- rara envolvendo só inscrições sem dinheiro de verdade em jogo. Decisão de
-- escopo documentada em CLAUDE.md.
CREATE OR REPLACE FUNCTION public.enforce_capacity_on_confirmed_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_participants integer;
  v_confirmed_count integer;
  v_stock_qty integer;
  v_shirt_confirmed integer;
BEGIN
  IF NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' THEN
    RETURN NEW; -- já era confirmed, não é uma nova confirmação consumindo vaga/estoque
  END IF;

  -- Serializa inserts/updates concorrentes pro mesmo evento (senão duas transações
  -- simultâneas leem a mesma contagem "antiga" e ambas passam na checagem).
  PERFORM 1 FROM public.events WHERE id = NEW.event_id FOR UPDATE;

  SELECT max_participants INTO v_max_participants FROM public.events WHERE id = NEW.event_id;
  IF v_max_participants IS NOT NULL AND v_max_participants > 0 THEN
    SELECT count(*) INTO v_confirmed_count FROM public.registrations
      WHERE event_id = NEW.event_id AND status IN ('paid', 'confirmed');
    IF v_confirmed_count >= v_max_participants THEN
      RAISE EXCEPTION 'Esgotado — este evento atingiu o limite de % vagas.', v_max_participants;
    END IF;
  END IF;

  IF NEW.shirt_size IS NOT NULL THEN
    SELECT quantity_total INTO v_stock_qty FROM public.shirt_stock
      WHERE event_id = NEW.event_id AND size = NEW.shirt_size;
    IF v_stock_qty IS NOT NULL THEN
      SELECT count(*) INTO v_shirt_confirmed FROM public.registrations
        WHERE event_id = NEW.event_id AND shirt_size = NEW.shirt_size AND status IN ('paid', 'confirmed');
      IF v_shirt_confirmed >= v_stock_qty THEN
        RAISE EXCEPTION 'O tamanho % esgotou pra este evento.', NEW.shirt_size;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_capacity_on_confirmed_registration ON public.registrations;
CREATE TRIGGER trg_enforce_capacity_on_confirmed_registration
  BEFORE INSERT OR UPDATE OF status ON public.registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_capacity_on_confirmed_registration();
