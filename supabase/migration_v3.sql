-- ============================================================
-- Migration v3 — Tabela de configurações do sistema
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  active_flavor_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  unit_price_eur_cents INTEGER NOT NULL DEFAULT 170,
  freight_eur_cents INTEGER NOT NULL DEFAULT 0,
  min_order_eur_cents INTEGER NOT NULL DEFAULT 8500,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante que só existe uma linha
ALTER TABLE settings ADD CONSTRAINT settings_single_row CHECK (id = 1);

-- Inserir configuração padrão (todos os sabores ativos)
INSERT INTO settings (id, active_flavor_ids, unit_price_eur_cents, freight_eur_cents, min_order_eur_cents)
VALUES (1,
  '["abacate","abacaxi-cremoso","acai","amendoim","blue-ice","caja","chocotella","coco","coco-queimado","creme-milho","cupuacu","flocos","laka-flocado","leite-condensado","limao","manga","maracuja","morango","mousse-maracuja","ninho-morango","ninho-oreo","pacoquinha","pina-colada","prestigio","rocher","romeu-julieta","sonho","tropical","uva"]',
  170, 0, 8500
)
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública permitida (o site precisa carregar as configs)
CREATE POLICY "Public read settings" ON settings FOR SELECT TO anon, authenticated USING (true);

-- Escrita só via service_role (server-side)
CREATE POLICY "No public write settings" ON settings FOR UPDATE TO anon, authenticated USING (false);

-- Remover coluna freight do orders (não é mais gerenciado por pedido)
-- ALTER TABLE orders DROP COLUMN IF EXISTS freight_eur_cents; -- descomente se quiser limpar
