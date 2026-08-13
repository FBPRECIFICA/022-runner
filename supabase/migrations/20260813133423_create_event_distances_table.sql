-- PADRÃO DEFINITIVO — kits presos à distância (Notion: página do bug de camiseta,
-- seção "PADRÃO DEFINITIVO (13/08/2026) — Estrutura de Distância + Kit").
-- Nova tabela espelhando o padrão já usado em registration_types.
CREATE TABLE public.event_distances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_distances_event_id ON public.event_distances(event_id);

ALTER TABLE public.event_distances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distâncias de eventos publicados visíveis"
  ON public.event_distances FOR SELECT
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_distances.event_id AND events.status = 'published'));

CREATE POLICY "Organizadores gerenciam distâncias dos próprios eventos"
  ON public.event_distances FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = event_distances.event_id AND events.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = event_distances.event_id AND events.organizer_id = auth.uid()));

CREATE POLICY "Admin gerencia todas as distâncias"
  ON public.event_distances FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));
