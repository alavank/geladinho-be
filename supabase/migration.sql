-- ============================================================
-- Geladinho BE - Schema Migration
-- Execute this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_name           TEXT NOT NULL,
  customer_phone_e164     TEXT NOT NULL,
  address_street          TEXT NOT NULL,
  address_number          TEXT NOT NULL,
  address_unit            TEXT,
  address_postal_code     TEXT NOT NULL,
  address_city            TEXT NOT NULL,
  address_country         TEXT NOT NULL DEFAULT 'Belgium',
  payment_method          TEXT NOT NULL CHECK (payment_method IN ('dinheiro', 'cartao', 'transferencia')),
  notes                   TEXT,
  total_units             INTEGER NOT NULL CHECK (total_units >= 50),
  total_price_eur_cents   INTEGER NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_preparo', 'em_rota', 'entregue', 'cancelado'))
);

-- ============================================================
-- ORDER ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  flavor_name           TEXT NOT NULL,
  unit_price_eur_cents  INTEGER NOT NULL DEFAULT 170,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  line_total_eur_cents  INTEGER NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- No public access - all access goes through service_role (server-side API)
-- service_role bypasses RLS automatically

-- Policy: deny everything for anon/authenticated roles
-- (service_role bypasses RLS, so these won't affect our server-side code)
CREATE POLICY "No public read on orders" ON orders
  FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "No public write on orders" ON orders
  FOR INSERT TO anon, authenticated WITH CHECK (false);

CREATE POLICY "No public read on order_items" ON order_items
  FOR SELECT TO anon, authenticated USING (false);

CREATE POLICY "No public write on order_items" ON order_items
  FOR INSERT TO anon, authenticated WITH CHECK (false);
