export type OrderStatus = 'novo' | 'em_preparo' | 'em_rota' | 'entregue' | 'cancelado';
export type OrderChannel = 'b2c' | 'b2b';

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

export interface Expense {
  id: string;
  created_at: string;
  date: string;
  category_id: string;
  supplier_id: string | null;
  description: string;
  amount_eur_cents: number;
  receipt_image_url: string | null;
  ocr_raw_data: OcrResult | null;
  notes: string | null;
  // Joined fields
  category?: ExpenseCategory;
  supplier?: Supplier;
}

export interface OcrResult {
  total_amount?: number;
  date?: string;
  supplier_name?: string;
  items?: Array<{ name: string; quantity?: number; price?: number }>;
  raw_text?: string;
}

// ============================================================
// Order Types
// ============================================================

export interface Order {
  id: string;
  created_at: string;
  channel: OrderChannel;
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
  status: OrderStatus;
  order_items?: OrderItem[];
}
