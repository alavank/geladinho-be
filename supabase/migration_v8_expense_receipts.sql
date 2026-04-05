-- ============================================================
-- Migration v8 - Gastos com cabecalho de compra + itens
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS location_address TEXT,
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE expenses
SET items = jsonb_build_array(
  jsonb_build_object(
    'name', COALESCE(NULLIF(description, ''), 'Item'),
    'quantity', 1,
    'unit_price_eur_cents', amount_eur_cents,
    'line_total_eur_cents', amount_eur_cents
  )
)
WHERE items = '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_expenses_invoice_number ON expenses(invoice_number);
