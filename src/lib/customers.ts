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

export function getCustomerFullAddress(
  customer: Pick<Customer, 'address_full' | 'address_street' | 'address_number' | 'address_postal_code' | 'address_city'>
) {
  return (
    customer.address_full ||
    formatFullAddress({
      street: customer.address_street || '',
      number: customer.address_number || '',
      postalCode: customer.address_postal_code || '',
      city: customer.address_city || '',
      country: 'Belgium',
    }) ||
    ''
  );
}

export function getCustomerLinkDraft(customer: Customer) {
  return {
    customer_id: customer.id,
    customer_name: customer.name,
    establishment_name: customer.establishment_name || '',
    customer_phone: customer.phone_e164,
    customer_email: customer.email || '',
    address_full: getCustomerFullAddress(customer),
    address_street: customer.address_street || '',
    address_number: customer.address_number || '',
    address_postal_code: customer.address_postal_code || '',
    address_city: customer.address_city || '',
    notes: customer.notes || '',
  };
}
