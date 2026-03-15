-- ============================================================
-- Migration v4 — Adicionar flavor_configs na tabela settings
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE settings ADD COLUMN IF NOT EXISTS flavor_configs JSONB;

-- Preenche com valores padrão para quem já tem a tabela
UPDATE settings SET flavor_configs = '[
  {"id":"abacate","active":true,"priceEurCents":170},
  {"id":"abacaxi-cremoso","active":true,"priceEurCents":170},
  {"id":"acai","active":true,"priceEurCents":170},
  {"id":"amendoim","active":true,"priceEurCents":170},
  {"id":"blue-ice","active":true,"priceEurCents":170},
  {"id":"caja","active":true,"priceEurCents":170},
  {"id":"chocotella","active":true,"priceEurCents":170},
  {"id":"coco","active":true,"priceEurCents":170},
  {"id":"coco-queimado","active":true,"priceEurCents":170},
  {"id":"creme-milho","active":true,"priceEurCents":170},
  {"id":"cupuacu","active":true,"priceEurCents":170},
  {"id":"flocos","active":true,"priceEurCents":170},
  {"id":"laka-flocado","active":true,"priceEurCents":170},
  {"id":"leite-condensado","active":true,"priceEurCents":170},
  {"id":"limao","active":true,"priceEurCents":170},
  {"id":"manga","active":true,"priceEurCents":170},
  {"id":"maracuja","active":true,"priceEurCents":170},
  {"id":"morango","active":true,"priceEurCents":170},
  {"id":"mousse-maracuja","active":true,"priceEurCents":170},
  {"id":"ninho-morango","active":true,"priceEurCents":170},
  {"id":"ninho-oreo","active":true,"priceEurCents":170},
  {"id":"pacoquinha","active":true,"priceEurCents":170},
  {"id":"pina-colada","active":true,"priceEurCents":170},
  {"id":"prestigio","active":true,"priceEurCents":170},
  {"id":"rocher","active":true,"priceEurCents":170},
  {"id":"romeu-julieta","active":true,"priceEurCents":170},
  {"id":"sonho","active":true,"priceEurCents":170},
  {"id":"tropical","active":true,"priceEurCents":170},
  {"id":"uva","active":true,"priceEurCents":170}
]'::jsonb WHERE id = 1;
