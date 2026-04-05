-- ============================================================
-- Migration v6 — Módulo de Gastos (Despesas)
-- Execute no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- EXPENSE CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6B7280',
  icon        TEXT NOT NULL DEFAULT '📦',
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- Categorias iniciais
INSERT INTO expense_categories (name, color, icon) VALUES
  ('Matéria-prima',  '#E05A20', '🛒'),
  ('Combustível',    '#0369A1', '⛽'),
  ('Freelancer',     '#7C3AED', '👷'),
  ('Embalagens',     '#059669', '📦'),
  ('Outros',         '#6B7280', '📋');

-- ============================================================
-- SUPPLIERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  notes       TEXT,
  active      BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date                DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id         UUID NOT NULL REFERENCES expense_categories(id),
  supplier_id         UUID REFERENCES suppliers(id),
  description         TEXT NOT NULL,
  amount_eur_cents    INTEGER NOT NULL CHECK (amount_eur_cents > 0),
  receipt_image_url   TEXT,
  ocr_raw_data        JSONB,
  notes               TEXT
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(active);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Deny all public/authenticated access (service_role bypasses RLS)
CREATE POLICY "No public access on expense_categories" ON expense_categories
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No public access on suppliers" ON suppliers
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No public access on expenses" ON expenses
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- ============================================================
-- STORAGE BUCKET for receipt images
-- ============================================================
-- Run this separately in Supabase SQL Editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);
