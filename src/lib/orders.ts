import { formatFullAddress } from '@/lib/address';
import { Order, OrderStatus, OrderStatusConfig } from '@/types';

export const DEFAULT_ORDER_STATUS_CONFIGS: OrderStatusConfig[] = [
  { key: 'novo', label: 'Novo', color: '#2563EB', sort_order: 1, active: true },
  { key: 'em_preparo', label: 'Em Preparo', color: '#D97706', sort_order: 2, active: true },
  { key: 'em_rota', label: 'Em Rota', color: '#7C3AED', sort_order: 3, active: true },
  { key: 'entregue', label: 'Entregue', color: '#059669', sort_order: 4, active: true },
  { key: 'cancelado', label: 'Cancelado', color: '#DC2626', sort_order: 5, active: true },
];

export function getStatusConfig(
  status: string,
  configs?: OrderStatusConfig[]
): OrderStatusConfig {
  const fromConfigs = configs?.find((config) => config.key === status);
  if (fromConfigs) return fromConfigs;
  return (
    DEFAULT_ORDER_STATUS_CONFIGS.find((config) => config.key === status) ||
    {
      key: status as OrderStatus,
      label: status,
      color: '#6B7280',
      sort_order: 999,
      active: true,
    }
  );
}

export function getStatusBadgeStyle(status: string, configs?: OrderStatusConfig[]) {
  const config = getStatusConfig(status, configs);
  return {
    backgroundColor: `${config.color}20`,
    color: config.color,
  };
}

export function formatOrderAddress(
  order: Pick<
    Order,
    'address_street' | 'address_number' | 'address_postal_code' | 'address_city' | 'address_country'
  >
): string {
  return (
    formatFullAddress({
      street: order.address_street,
      number: order.address_number,
      postalCode: order.address_postal_code,
      city: order.address_city,
      country: order.address_country || 'Belgium',
    }) ||
    `${order.address_street}, ${order.address_number} - ${order.address_postal_code} ${order.address_city}, ${order.address_country || 'Belgium'}`
  );
}
