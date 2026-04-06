-- ============================================================
-- V11: Allow custom order statuses
-- ============================================================

-- Remove CHECK constraint from order_status_configs.key
ALTER TABLE order_status_configs DROP CONSTRAINT IF EXISTS order_status_configs_key_check;

-- Remove CHECK constraint from orders.status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add foreign key from orders.status to order_status_configs.key
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_fk;
ALTER TABLE orders
  ADD CONSTRAINT orders_status_fk
  FOREIGN KEY (status)
  REFERENCES order_status_configs (key);
