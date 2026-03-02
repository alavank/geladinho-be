// ============================================================
// Domain Types
// ============================================================

export type PaymentMethod = 'dinheiro' | 'cartao' | 'transferencia';

export type OrderStatus = 'novo' | 'em_preparo' | 'em_rota' | 'entregue' | 'cancelado';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  novo: 'Novo',
  em_preparo: 'Em Preparo',
  em_rota: 'Em Rota',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  transferencia: 'Transferência Bancária',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  novo: 'bg-blue-100 text-blue-800',
  em_preparo: 'bg-yellow-100 text-yellow-800',
  em_rota: 'bg-purple-100 text-purple-800',
  entregue: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
};

// ============================================================
// Flavor
// ============================================================
export interface Flavor {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ============================================================
// Cart
// ============================================================
export interface CartItem {
  flavorId: string;
  flavorName: string;
  quantity: number;
}

// ============================================================
// Order
// ============================================================
export interface OrderItem {
  id: string;
  order_id: string;
  flavor_name: string;
  unit_price_eur_cents: number;
  quantity: number;
  line_total_eur_cents: number;
}

export interface Order {
  id: string;
  created_at: string;
  customer_name: string;
  customer_phone_e164: string;
  address_street: string;
  address_number: string;
  address_unit: string | null;
  address_postal_code: string;
  address_city: string;
  address_country: string;
  payment_method: PaymentMethod;
  notes: string | null;
  total_units: number;
  total_price_eur_cents: number;
  status: OrderStatus;
  order_items?: OrderItem[];
}

// ============================================================
// API Payloads
// ============================================================
export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  addressStreet: string;
  addressNumber: string;
  addressUnit?: string;
  addressPostalCode: string;
  addressCity: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: { flavorName: string; quantity: number }[];
}
