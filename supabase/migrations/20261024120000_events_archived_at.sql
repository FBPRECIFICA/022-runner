-- Arquivar evento nas contas do admin (organização interna, NÃO muda nada pro público).
-- archived_at null = evento ativo nos totais do admin; preenchido = arquivado.
-- events.status NÃO é tocado: páginas públicas, resultados e pódio dependem dele.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS archived_at timestamptz NULL;

-- Arquivados iniciais (decisão Sr. Fábio 24/10/2026): Arena MMP, Balneário Run e
-- Corrida Solidária (gratuita: 567 inscrições confirmadas a R$0, nenhuma via Asaas).
-- Roda antes do trigger abaixo existir.
UPDATE public.events SET archived_at = now()
WHERE id IN (
  'f5b7e2de-e3c3-42f5-a2b0-f3a709247edd', -- 1º Corrida do Aniversário da Arena MMP
  'fa9e580b-3a7b-4dac-9e75-287c0b76ef54', -- Balneário Run
  'a75e39c3-2eff-45b8-89db-d27e90c51af8'  -- 1º CORRIDA SOLIDÁRIA
) AND archived_at IS NULL;

-- Organizador pode dar UPDATE no próprio evento (policy existente), então trava a coluna:
-- só admin muda archived_at. auth.uid() nulo = service role / migration, liberado.
CREATE OR REPLACE FUNCTION public.guard_event_archived_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at
     AND auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente admin pode arquivar/desarquivar evento';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_event_archived_at ON public.events;
CREATE TRIGGER guard_event_archived_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.guard_event_archived_at();

-- RPC usada pelo painel admin: grava archived_at e registra quem/quando em audit_logs.
CREATE OR REPLACE FUNCTION public.set_event_archived(p_event_id uuid, p_archived boolean)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_at timestamptz;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente admin pode arquivar/desarquivar evento';
  END IF;

  UPDATE public.events
     SET archived_at = CASE WHEN p_archived THEN now() ELSE NULL END
   WHERE id = p_event_id
  RETURNING archived_at INTO v_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento não encontrado';
  END IF;

  INSERT INTO public.audit_logs (user_id, action, details, created_at)
  VALUES (auth.uid(), CASE WHEN p_archived THEN 'event_archived' ELSE 'event_unarchived' END,
          jsonb_build_object('event_id', p_event_id), now());

  RETURN v_at;
END;
$$;

REVOKE ALL ON FUNCTION public.set_event_archived(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_event_archived(uuid, boolean) TO authenticated;
