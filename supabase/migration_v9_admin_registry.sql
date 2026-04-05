-- ============================================================
-- Migration v9 - Cadastros gerais do admin
-- Clientes + configuracao de status de pedido
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type                TEXT NOT NULL CHECK (type IN ('b2c', 'b2b')) DEFAULT 'b2c',
  name                TEXT NOT NULL,
  establishment_name  TEXT,
  phone_e164          TEXT NOT NULL,
  email               TEXT,
  address_full        TEXT,
  address_street      TEXT,
  address_number      TEXT,
  address_postal_code TEXT,
  address_city        TEXT,
  notes               TEXT,
  active              BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone_e164);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

CREATE TABLE IF NOT EXISTS order_status_configs (
  key         TEXT PRIMARY KEY CHECK (key IN ('novo', 'em_preparo', 'em_rota', 'entregue', 'cancelado')),
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO order_status_configs (key, label, color, sort_order, active)
VALUES
  ('novo', 'Novo', '#2563EB', 1, TRUE),
  ('em_preparo', 'Em Preparo', '#D97706', 2, TRUE),
  ('em_rota', 'Em Rota', '#7C3AED', 3, TRUE),
  ('entregue', 'Entregue', '#059669', 4, TRUE),
  ('cancelado', 'Cancelado', '#DC2626', 5, TRUE)
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access on customers" ON customers
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No public access on order_status_configs" ON order_status_configs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
