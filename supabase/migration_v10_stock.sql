-- ============================================================
-- V10: Stock & Production Module
-- ============================================================

-- Production batches: records when geladinhos are produced
CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  flavor_id TEXT NOT NULL,
  flavor_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT
);

ALTER TABLE production_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "production_batches_service" ON production_batches FOR ALL USING (true) WITH CHECK (true);

-- Stock adjustments: manual corrections (loss, donation, count correction)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  flavor_id TEXT NOT NULL,
  flavor_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,  -- positive = add, negative = remove
  reason TEXT NOT NULL,       -- 'perda', 'doacao', 'correcao', 'outro'
  notes TEXT
);

ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_adjustments_service" ON stock_adjustments FOR ALL USING (true) WITH CHECK (true);
