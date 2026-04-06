-- ============================================================
-- V12: Saved delivery routes
-- ============================================================

CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'Rue de la Vérité 45A, 1070 Anderlecht, Belgique',
  order_ids UUID[] NOT NULL,
  google_maps_url TEXT,
  waze_links JSONB,
  notes TEXT
);

ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_routes_service" ON saved_routes;
CREATE POLICY "saved_routes_service" ON saved_routes FOR ALL USING (true) WITH CHECK (true);
