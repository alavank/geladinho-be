export type OrderStatus = 'novo' | 'em_preparo' | 'em_rota' | 'entregue' | 'cancelado' | (string & {});
export type OrderChannel = 'b2c' | 'b2b';
export type CustomerType = 'b2c' | 'b2b';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  novo: 'Novo',
  em_preparo: 'Em Preparo',
  em_rota: 'Em Rota',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-yellow-100 text-yellow-800',
  em_rota: 'bg-purple-100 text-purple-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

export interface CartItem {
  flavorId: string;
  flavorName: string;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  flavor_name: string;
  unit_price_eur_cents: number;
  quantity: number;
  line_total_eur_cents: number;
}

// ============================================================
// Expense Module Types
// ============================================================

export interface ExpenseCategory {
  id: string;
  created_at: string;
  name: string;
  color: string;
  icon: string;
  active: boolean;
}

export interface Supplier {
  id: string;
  created_at: string;
  name: string;
  address: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
}

export interface Customer {
  id: string;
  created_at: string;
  type: CustomerType;
  name: string;
  establishment_name: string | null;
  phone_e164: string;
  email: string | null;
  address_full: string | null;
  address_street: string | null;
  address_number: string | null;
  address_postal_code: string | null;
  address_city: string | null;
  notes: string | null;
  active: boolean;
}

export interface OrderStatusConfig {
  key: OrderStatus;
  label: string;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface ExpenseItem {
  name: string;
  quantity: number;
  unit_price_eur_cents: number;
  line_total_eur_cents: number;
}

export interface Expense {
  id: string;
  created_at: string;
  date: string;
  category_id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  location_address: string | null;
  description: string;
  amount_eur_cents: number;
  receipt_image_url: string | null;
  ocr_raw_data: OcrResult | null;
  items: ExpenseItem[];
  notes: string | null;
  // Joined fields
  category?: ExpenseCategory;
  supplier?: Supplier;
}

export interface OcrResult {
  total_amount?: number;
  date?: string;
  supplier_name?: string;
  supplier_address?: string | null;
  invoice_number?: string | null;
  items?: Array<{
    name: string;
    quantity?: number | null;
    unit_price?: number | null;
    line_total?: number | null;
  }>;
  raw_text?: string;
}

// ============================================================
// Order Types
// ============================================================

export interface Order {
  id: string;
  created_at: string;
  channel: OrderChannel;
  customer_id?: string | null;
  customer_name: string;
  customer_phone_e164: string;
  customer_email?: string | null;
  establishment_name?: string | null;
  address_street: string;
  address_number: string;
  address_unit: string | null;
  address_postal_code: string;
  address_city: string;
  address_country: string;
  payment_method: string;
  needs_change: boolean;
  change_amount_eur_cents: number | null;
  notes: string | null;
  total_units: number;
  total_price_eur_cents: number;
  freight_eur_cents: number;
  latitude: number | null;
  longitude: number | null;
  status: OrderStatus;
  order_items?: OrderItem[];
}

// ============================================================
// Stock & Production Module Types
// ============================================================

export interface ProductionBatch {
  id: string;
  created_at: string;
  date: string;
  flavor_id: string;
  flavor_name: string;
  quantity: number;
  notes: string | null;
}

export type StockAdjustmentReason = 'perda' | 'doacao' | 'correcao' | 'outro';

export const STOCK_ADJUSTMENT_LABELS: Record<StockAdjustmentReason, string> = {
  perda: 'Perda',
  doacao: 'Doação',
  correcao: 'Correção de contagem',
  outro: 'Outro',
};

export interface StockAdjustment {
  id: string;
  created_at: string;
  date: string;
  flavor_id: string;
  flavor_name: string;
  quantity: number;
  reason: StockAdjustmentReason;
  notes: string | null;
}

export interface StockLevel {
  flavorId: string;
  flavorName: string;
  produced: number;
  sold: number;
  adjusted: number;
  current: number;
}

// ============================================================
// Route Module Types
// ============================================================

export interface SavedRoute {
  id: string;
  created_at: string;
  name: string;
  origin: string;
  order_ids: string[];
  google_maps_url: string | null;
  waze_links: { from: string; to: string; url: string }[] | null;
  notes: string | null;
}
