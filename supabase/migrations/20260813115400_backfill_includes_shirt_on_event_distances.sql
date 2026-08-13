-- Complemento da migration anterior: eventos que embutem o kit no nome da
-- distância (events.distances, sem usar registration_types — caso do Arena
-- MMP) recebem a mesma flag por item do array, no mesmo padrão.
UPDATE events
SET distances = (
  SELECT jsonb_agg(
    CASE WHEN elem ? 'includes_shirt' THEN elem
         WHEN elem->>'name' ILIKE '%econ%' THEN elem || '{"includes_shirt": false}'::jsonb
         ELSE elem || '{"includes_shirt": true}'::jsonb
    END
  )
  FROM jsonb_array_elements(distances) elem
)
WHERE distances IS NOT NULL AND jsonb_array_length(distances) > 0;
