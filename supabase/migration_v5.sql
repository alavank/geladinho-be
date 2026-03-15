-- ============================================================
-- Migration v5 — Atualiza flavor_configs com campo name
-- Execute no Supabase SQL Editor
-- ============================================================

UPDATE settings SET flavor_configs = '[
  {"id":"abacate","name":"ABACATE","active":true,"priceEurCents":170},
  {"id":"abacaxi-cremoso","name":"ABACAXI CREMOSO","active":true,"priceEurCents":170},
  {"id":"acai","name":"AÇAÍ","active":true,"priceEurCents":170},
  {"id":"amendoim","name":"AMENDOIM","active":true,"priceEurCents":170},
  {"id":"blue-ice","name":"BLUE ICE","active":true,"priceEurCents":170},
  {"id":"caja","name":"CAJÁ","active":true,"priceEurCents":170},
  {"id":"chocotella","name":"CHOCOTELLA","active":true,"priceEurCents":170},
  {"id":"coco","name":"CÔCO","active":true,"priceEurCents":170},
  {"id":"coco-queimado","name":"CÔCO QUEIMADO","active":true,"priceEurCents":170},
  {"id":"creme-milho","name":"CREME DE MILHO","active":true,"priceEurCents":170},
  {"id":"cupuacu","name":"CUPUAÇÚ","active":true,"priceEurCents":170},
  {"id":"flocos","name":"FLOCOS","active":true,"priceEurCents":170},
  {"id":"laka-flocado","name":"LAKA FLOCADO","active":true,"priceEurCents":170},
  {"id":"leite-condensado","name":"LEITE CONDENSADO","active":true,"priceEurCents":170},
  {"id":"limao","name":"LIMÃO","active":true,"priceEurCents":170},
  {"id":"manga","name":"MANGA","active":true,"priceEurCents":170},
  {"id":"maracuja","name":"MARACUJÁ","active":true,"priceEurCents":170},
  {"id":"morango","name":"MORANGO","active":true,"priceEurCents":170},
  {"id":"mousse-maracuja","name":"MOUSSE DE MARACUJÁ","active":true,"priceEurCents":170},
  {"id":"ninho-morango","name":"NINHO COM MORANGO","active":true,"priceEurCents":170},
  {"id":"ninho-oreo","name":"NINHO COM OREO","active":true,"priceEurCents":170},
  {"id":"pacoquinha","name":"PAÇOQUINHA","active":true,"priceEurCents":170},
  {"id":"pina-colada","name":"PIÑA COLADA","active":true,"priceEurCents":170},
  {"id":"prestigio","name":"PRESTÍGIO","active":true,"priceEurCents":170},
  {"id":"rocher","name":"ROCHER","active":true,"priceEurCents":170},
  {"id":"romeu-julieta","name":"ROMEU E JULIETA","active":true,"priceEurCents":170},
  {"id":"sonho","name":"SONHO","active":true,"priceEurCents":170},
  {"id":"tropical","name":"TROPICAL","active":true,"priceEurCents":170},
  {"id":"uva","name":"UVA","active":true,"priceEurCents":170}
]'::jsonb WHERE id = 1;
