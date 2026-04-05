-- ============================================================
-- Migration v7 — Adicionar coordenadas geográficas aos pedidos
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_orders_coords ON orders(latitude, longitude) WHERE latitude IS NOT NULL;
