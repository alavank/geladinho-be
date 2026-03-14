-- ============================================================
-- Migration v2 — Adicionar campos de troco e frete
-- Execute no Supabase SQL Editor APÓS a migration.sql inicial
-- ============================================================

-- Troco
ALTER TABLE orders ADD COLUMN IF NOT EXISTS needs_change BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_amount_eur_cents INTEGER;

-- Frete (definido pelo admin depois)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS freight_eur_cents INTEGER NOT NULL DEFAULT 0;

-- Tornar payment_method opcional (campo removido do formulário)
ALTER TABLE orders ALTER COLUMN payment_method DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'dinheiro';
