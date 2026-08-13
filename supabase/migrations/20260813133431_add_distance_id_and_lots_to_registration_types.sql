ALTER TABLE public.registration_types
  ADD COLUMN distance_id uuid REFERENCES public.event_distances(id) ON DELETE CASCADE,
  ADD COLUMN lots jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX idx_registration_types_distance_id ON public.registration_types(distance_id);
