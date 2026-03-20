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
