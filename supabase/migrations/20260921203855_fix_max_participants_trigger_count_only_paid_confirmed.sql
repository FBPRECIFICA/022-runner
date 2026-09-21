-- fn_enforce_max_participants contava toda inscrição não-cancelada (inclusive
-- 'pending' nunca paga) contra o limite geral de vagas, diferente do trigger
-- trg_enforce_capacity_on_confirmed_registration (20260918140000), que já conta
-- certo (só 'paid'/'confirmed'). Efeito real: Arena MMP com max_participants=180
-- acumulou 81 pendentes abandonadas + 123 pagas/confirmadas = 204 > 180, e passou
-- a bloquear QUALQUER inscrição nova (inclusive troca de kit de quem já tinha
-- vaga) mesmo com só 123 vagas realmente ocupadas. Notion "URGENTE — 022RUNNERS:
-- Cliente Travada Sem Poder Trocar de Kit (Louhana)". Este trigger não estava em
-- nenhuma migration rastreada do repo (criado direto no banco antes de
-- 18/09) — corrigido aqui em vez de removido, por instrução explícita do
-- Fábio, pra manter o mesmo efeito de "trava na criação" que ele já tinha,
-- só com a contagem certa. Testado em staging (branch efêmera, deletada após o
-- teste): pending novo bloqueado (bug) -> liberado (fix); confirmed ainda trava
-- certo no limite via trg_enforce_capacity_on_confirmed_registration, intocado.
-- Já aplicado diretamente em produção antes deste arquivo (mesmo padrão de
-- outras correções urgentes neste projeto) — este arquivo só sincroniza o
-- histórico de migrations rastreado com o estado real do banco.
CREATE OR REPLACE FUNCTION public.fn_enforce_max_participants()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_max integer;
  v_count integer;
BEGIN
  IF NEW.event_id = 'a75e39c3-2eff-45b8-89db-d27e90c51af8' THEN
    RAISE EXCEPTION 'Inscrições pausadas temporariamente para este evento pelo organizador';
  END IF;
  SELECT max_participants INTO v_max FROM events WHERE id = NEW.event_id;
  IF v_max IS NOT NULL AND v_max > 0 THEN
    SELECT count(*) INTO v_count FROM registrations WHERE event_id = NEW.event_id AND status IN ('paid', 'confirmed');
    IF v_count >= v_max THEN
      RAISE EXCEPTION 'Vagas esgotadas para este evento (limite % atingido)', v_max;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
