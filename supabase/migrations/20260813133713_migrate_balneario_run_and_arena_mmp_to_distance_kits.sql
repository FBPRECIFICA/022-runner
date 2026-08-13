-- Migração de dados pro padrão distância+kit (idempotente — já foi aplicada
-- manualmente nesta sessão; guards evitam duplicar ao rodar de novo/replay).

-- Balneário Run: 1 distância, vincula os 2 kits já existentes.
INSERT INTO event_distances (event_id, name, sort_order)
SELECT id, '5km', 0 FROM events WHERE slug = 'balneario-run'
  AND NOT EXISTS (SELECT 1 FROM event_distances ed WHERE ed.event_id = events.id AND ed.name = '5km');

UPDATE registration_types rt
SET distance_id = ed.id,
    lots = jsonb_build_array(jsonb_build_object('price', rt.price, 'qty', null))
FROM event_distances ed, events ev
WHERE ev.slug = 'balneario-run' AND ed.event_id = ev.id AND ed.name = '5km'
  AND rt.event_id = ev.id AND rt.distance_id IS NULL;

-- Arena MMP: 2 distâncias reais (5km, 3km caminhada) substituindo as 3
-- "distâncias" que na verdade misturavam distância com variação de kit.
INSERT INTO event_distances (event_id, name, sort_order)
SELECT ev.id, v.name, v.sort_order
FROM events ev, (VALUES ('5km', 0), ('3km caminhada', 1)) AS v(name, sort_order)
WHERE ev.slug = '1-corrida-do-aniversario-da-arena-mmp-'
  AND NOT EXISTS (SELECT 1 FROM event_distances ed WHERE ed.event_id = ev.id AND ed.name = v.name);

INSERT INTO registration_types (event_id, distance_id, name, price, sort_order, includes_shirt, lots)
SELECT ev.id, ed5.id, 'Kit Completo', 109.90, 0, true,
  '[{"price":109.90,"qty":150},{"price":119.90,"qty":200}]'::jsonb
FROM events ev JOIN event_distances ed5 ON ed5.event_id = ev.id AND ed5.name = '5km'
WHERE ev.slug = '1-corrida-do-aniversario-da-arena-mmp-'
  AND NOT EXISTS (SELECT 1 FROM registration_types rt WHERE rt.distance_id = ed5.id AND rt.name = 'Kit Completo');

INSERT INTO registration_types (event_id, distance_id, name, price, sort_order, includes_shirt, lots)
SELECT ev.id, ed5.id, 'Kit Econômico', 69.90, 1, false,
  '[{"price":69.90,"qty":100}]'::jsonb
FROM events ev JOIN event_distances ed5 ON ed5.event_id = ev.id AND ed5.name = '5km'
WHERE ev.slug = '1-corrida-do-aniversario-da-arena-mmp-'
  AND NOT EXISTS (SELECT 1 FROM registration_types rt WHERE rt.distance_id = ed5.id AND rt.name = 'Kit Econômico');

-- "3km caminhada" Kit Econômico fica pausado (preço a definir com o organizador) — não criado aqui.
INSERT INTO registration_types (event_id, distance_id, name, price, sort_order, includes_shirt, lots)
SELECT ev.id, edc.id, 'Kit Completo', 109.90, 0, true,
  '[{"price":109.90,"qty":100}]'::jsonb
FROM events ev JOIN event_distances edc ON edc.event_id = ev.id AND edc.name = '3km caminhada'
WHERE ev.slug = '1-corrida-do-aniversario-da-arena-mmp-'
  AND NOT EXISTS (SELECT 1 FROM registration_types rt WHERE rt.distance_id = edc.id AND rt.name = 'Kit Completo');

-- Backfill de registration_type_id nas inscrições existentes do Balneário Run
-- (4 ficaram órfãs por um bug separado: salvar o evento apagava e recriava os
-- kits com IDs novos — corrigido em seguida no OrganizerDashboard.tsx).
UPDATE registrations r
SET registration_type_id = rt.id
FROM registration_types rt
WHERE r.event_id = (SELECT id FROM events WHERE slug = 'balneario-run')
  AND r.registration_type_id IS NULL
  AND rt.event_id = r.event_id
  AND rt.name = r.registration_type_name;

-- Backfill de registration_type_id + campos denormalizados nas 71 inscrições
-- do Arena MMP (nenhuma tinha vínculo, pois o evento nunca usou registration_types).
-- "5km" puro (sem sufixo) é anterior à divisão em kits — inferido como Kit Completo
-- porque o preço pago bate exatamente (R$109,90) e todas tinham camisa preenchida.
WITH ev AS (SELECT id FROM events WHERE slug = '1-corrida-do-aniversario-da-arena-mmp-')
UPDATE registrations r
SET registration_type_id = CASE
      WHEN trim(r.distance_name) = '3km caminhada' THEN
        (SELECT rt.id FROM registration_types rt JOIN event_distances ed ON ed.id = rt.distance_id
         WHERE ed.event_id = ev.id AND ed.name = '3km caminhada' AND rt.name = 'Kit Completo')
      WHEN r.distance_name = '5km Kit Econômico' THEN
        (SELECT rt.id FROM registration_types rt JOIN event_distances ed ON ed.id = rt.distance_id
         WHERE ed.event_id = ev.id AND ed.name = '5km' AND rt.name = 'Kit Econômico')
      WHEN r.distance_name = '5km' THEN
        (SELECT rt.id FROM registration_types rt JOIN event_distances ed ON ed.id = rt.distance_id
         WHERE ed.event_id = ev.id AND ed.name = '5km' AND rt.name = 'Kit Completo')
    END,
    registration_type_name = CASE
      WHEN trim(r.distance_name) = '3km caminhada' THEN 'Kit Completo'
      WHEN r.distance_name = '5km Kit Econômico' THEN 'Kit Econômico'
      WHEN r.distance_name = '5km' THEN 'Kit Completo'
    END,
    registration_type_price = CASE
      WHEN trim(r.distance_name) = '3km caminhada' THEN 109.90
      WHEN r.distance_name = '5km Kit Econômico' THEN 69.90
      WHEN r.distance_name = '5km' THEN 109.90
    END
FROM ev
WHERE r.event_id = ev.id AND r.registration_type_id IS NULL;
