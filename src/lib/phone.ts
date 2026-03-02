/**
 * Normalize Belgian phone numbers to E.164 format (+32XXXXXXXXX)
 * Accepts:
 *   +32 XXX XX XX XX
 *   0032 XXX XX XX XX
 *   04XX XX XX XX (mobile)
 *   0X XXX XX XX (landline)
 */
export function normalizeBelgianPhone(input: string): string | null {
  // Remove all spaces, dashes, dots, parentheses
  const cleaned = input.replace(/[\s\-\.\(\)]/g, '');

  // Already E.164
  if (/^\+32\d{8,9}$/.test(cleaned)) return cleaned;

  // International format 0032...
  if (/^0032\d{8,9}$/.test(cleaned)) {
    return '+32' + cleaned.slice(4);
  }

  // Local format 0XXXXXXXXX (10 digits starting with 0)
  if (/^0\d{9}$/.test(cleaned)) {
    return '+32' + cleaned.slice(1);
  }

  // Local format 0XXXXXXXX (9 digits starting with 0, landline)
  if (/^0\d{8}$/.test(cleaned)) {
    return '+32' + cleaned.slice(1);
  }

  return null;
}

export function isValidBelgianPhone(input: string): boolean {
  return normalizeBelgianPhone(input) !== null;
}
