export interface StructuredAddress {
  street: string;
  number: string;
  postalCode: string;
  city: string;
  country?: string;
}

export function formatFullAddress({
  street,
  number,
  postalCode,
  city,
  country,
}: StructuredAddress): string {
  const line1 = [street, number].filter(Boolean).join(' ').trim();
  const line2 = [postalCode, city].filter(Boolean).join(' ').trim();
  return [line1, line2, country].filter(Boolean).join(', ');
}

export function hasStructuredAddress({
  street,
  number,
  postalCode,
  city,
}: StructuredAddress): boolean {
  return [street, number, postalCode, city].every((value) => value.trim().length > 0);
}
