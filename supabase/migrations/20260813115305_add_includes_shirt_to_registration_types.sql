-- URGENTE — Kit Econômico permitindo escolha de camiseta (Notion: página
-- "URGENTE — 022RUNNERS: Kit Econômico Permitindo Escolha de Camiseta").
-- Não havia flag indicando se um kit inclui camiseta; o formulário sempre
-- mostrava o campo. Adiciona a flag e faz backfill dos dados existentes.
ALTER TABLE registration_types ADD COLUMN includes_shirt boolean NOT NULL DEFAULT true;
UPDATE registration_types SET includes_shirt = false WHERE name ILIKE '%econ%';
