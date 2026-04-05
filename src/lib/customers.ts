import { formatFullAddress } from '@/lib/address';
import { Customer } from '@/types';

export function normalizeCustomerRecord(customer: Customer): Customer {
  const addressFull =
    customer.address_full ||
    formatFullAddress({
      street: customer.address_street || '',
      number: customer.address_number || '',
      postalCode: customer.address_postal_code || '',
      city: customer.address_city || '',
      country: 'Belgium',
    }) ||
    null;

  return {
    ...customer,
    establishment_name: customer.establishment_name || null,
    email: customer.email || null,
    address_full: addressFull,
    address_street: customer.address_street || null,
    address_number: customer.address_number || null,
    address_postal_code: customer.address_postal_code || null,
    address_city: customer.address_city || null,
    notes: customer.notes || null,
  };
}

export function getCustomerDisplayName(customer: Pick<Customer, 'type' | 'name' | 'establishment_name'>) {
  if (customer.type === 'b2b' && customer.establishment_name) {
    return `${customer.establishment_name} (${customer.name})`;
  }
  return customer.name;
}
