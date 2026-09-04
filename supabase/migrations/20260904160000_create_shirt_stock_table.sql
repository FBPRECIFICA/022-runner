-- Controle de estoque de camisetas por tamanho (Notion: "EXECUÇÃO — 022RUNNERS:
-- Controle de Estoque de Camisetas por Tamanho"). Pool único por evento
-- (compartilhado entre todas as distâncias/kits que incluem camisa), decisão
-- do Senhor Fábio de 04/09/2026 — mais simples e casa com a redação do pedido
-- ("organizador cadastra a quantidade de cada tamanho... por evento").
CREATE TABLE public.shirt_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  size text NOT NULL,
  quantity_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, size)
);

CREATE INDEX idx_shirt_stock_event_id ON public.shirt_stock(event_id);

ALTER TABLE public.shirt_stock ENABLE ROW LEVEL SECURITY;

-- Sem policy de SELECT pra anon/authenticated em geral: a disponibilidade é
-- exposta só via RPC get_shirt_availability (não expõe a tabela crua).
CREATE POLICY "Organizadores gerenciam estoque dos próprios eventos"
  ON public.shirt_stock FOR ALL
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = shirt_stock.event_id AND events.organizer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = shirt_stock.event_id AND events.organizer_id = auth.uid()));

CREATE POLICY "Admin gerencia todo estoque de camisetas"
  ON public.shirt_stock FOR ALL
  USING (public.is_admin());

-- Disponibilidade por tamanho, no mesmo padrão de get_event_confirmed_count/
-- check_cpf_registration: RPC SECURITY DEFINER que devolve só o agregado
-- necessário pro formulário público, sem abrir SELECT direto em `registrations`
-- (que não tem policy pra anon) nem em `shirt_stock` (que só organizador/admin
-- podem ler diretamente).
CREATE OR REPLACE FUNCTION public.get_shirt_availability(p_event_id uuid)
RETURNS TABLE(size text, quantity_total integer, confirmed_count integer, pending_count integer, available integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.size,
    s.quantity_total,
    COALESCE(c.confirmed_count, 0)::integer AS confirmed_count,
    COALESCE(p.pending_count, 0)::integer AS pending_count,
    GREATEST(s.quantity_total - COALESCE(c.confirmed_count, 0), 0)::integer AS available
  FROM shirt_stock s
  LEFT JOIN (
    SELECT shirt_size, COUNT(*) AS confirmed_count
    FROM registrations
    WHERE event_id = p_event_id AND status IN ('paid', 'confirmed')
    GROUP BY shirt_size
  ) c ON c.shirt_size = s.size
  LEFT JOIN (
    SELECT shirt_size, COUNT(*) AS pending_count
    FROM registrations
    WHERE event_id = p_event_id AND status IN ('pending', 'awaiting_payment')
    GROUP BY shirt_size
  ) p ON p.shirt_size = s.size
  WHERE s.event_id = p_event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_shirt_availability(uuid) TO anon, authenticated;
