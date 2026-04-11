/**
 * Multi-country phone validation and normalization to E.164 format.
 * Supported countries: Belgium, Luxembourg, France, Netherlands, Germany, Portugal
 */

export interface CountryPhone {
  code: string;        // ISO 3166-1 alpha-2
  name: string;
  dialCode: string;    // e.g. "+32"
  /** Regex patterns for local number (without country code, without leading 0) */
  localPatterns: RegExp[];
  /** Length of local number (digits after country code) */
  localLengths: number[];
}

/** Get flag image URL for a country code via flagcdn.com */
export function getFlagUrl(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

export const SUPPORTED_COUNTRIES: CountryPhone[] = [
  {
    code: 'BE',
    name: 'Bélgica',
    dialCode: '+32',

    localPatterns: [/^\d{8,9}$/],
    localLengths: [8, 9],
  },
  {
    code: 'LU',
    name: 'Luxemburgo',
    dialCode: '+352',

    localPatterns: [/^\d{6,9}$/],
    localLengths: [6, 7, 8, 9],
  },
  {
    code: 'FR',
    name: 'França',
    dialCode: '+33',

    localPatterns: [/^\d{9}$/],
    localLengths: [9],
  },
  {
    code: 'NL',
    name: 'Holanda',
    dialCode: '+31',

    localPatterns: [/^\d{9}$/],
    localLengths: [9],
  },
  {
    code: 'DE',
    name: 'Alemanha',
    dialCode: '+49',

    localPatterns: [/^\d{7,12}$/],
    localLengths: [7, 8, 9, 10, 11, 12],
  },
  {
    code: 'PT',
    name: 'Portugal',
    dialCode: '+351',

    localPatterns: [/^\d{9}$/],
    localLengths: [9],
  },
];

const DEFAULT_COUNTRY_CODE = 'BE';

function getCountry(code: string): CountryPhone | undefined {
  return SUPPORTED_COUNTRIES.find((c) => c.code === code);
}

/**
 * Normalize a phone number to E.164 format for a given country.
 * Accepts:
 *   +CC XXXXXXXXX  (already international)
 *   00CC XXXXXXXXX (double-zero international)
 *   0XXXXXXXXX     (local with leading zero — zero is stripped)
 *   XXXXXXXXX      (local without leading zero)
 */
export function normalizePhone(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): string | null {
  const country = getCountry(countryCode);
  if (!country) return null;

  const cleaned = input.replace(/[\s\-\.\(\)]/g, '');
  if (!cleaned) return null;

  const dialDigits = country.dialCode.slice(1); // e.g. "32"

  // Already E.164: +CC...
  if (cleaned.startsWith('+')) {
    // Check if it matches any supported country
    for (const c of SUPPORTED_COUNTRIES) {
      const dd = c.dialCode.slice(1);
      if (cleaned.startsWith('+' + dd)) {
        const local = cleaned.slice(1 + dd.length);
        if (c.localPatterns.some((p) => p.test(local))) {
          return '+' + dd + local;
        }
      }
    }
    return null;
  }

  // International format 00CC...
  if (cleaned.startsWith('00')) {
    const withoutZeros = cleaned.slice(2);
    // Try the selected country first
    if (withoutZeros.startsWith(dialDigits)) {
      const local = withoutZeros.slice(dialDigits.length);
      if (country.localPatterns.some((p) => p.test(local))) {
        return country.dialCode + local;
      }
    }
    // Try other countries
    for (const c of SUPPORTED_COUNTRIES) {
      const dd = c.dialCode.slice(1);
      if (withoutZeros.startsWith(dd)) {
        const local = withoutZeros.slice(dd.length);
        if (c.localPatterns.some((p) => p.test(local))) {
          return c.dialCode + local;
        }
      }
    }
    return null;
  }

  // Local format with leading 0 (strip it)
  if (cleaned.startsWith('0')) {
    const local = cleaned.slice(1);
    if (country.localPatterns.some((p) => p.test(local))) {
      return country.dialCode + local;
    }
    return null;
  }

  // Local format without leading 0
  if (country.localPatterns.some((p) => p.test(cleaned))) {
    return country.dialCode + cleaned;
  }

  return null;
}

export function isValidPhone(input: string, countryCode: string = DEFAULT_COUNTRY_CODE): boolean {
  return normalizePhone(input, countryCode) !== null;
}

// ─── Backward-compatible aliases ──────────────────────────────────────────────

export function normalizeBelgianPhone(input: string): string | null {
  return normalizePhone(input, 'BE');
}

export function isValidBelgianPhone(input: string): boolean {
  return isValidPhone(input, 'BE');
}

/**
 * Try to detect the country from an E.164 formatted phone number.
 * Returns the country code (e.g. 'BE') or the default.
 */
export function detectCountryFromE164(e164: string): string {
  if (!e164.startsWith('+')) return DEFAULT_COUNTRY_CODE;

  // Sort by dial code length descending so +352 matches before +35
  const sorted = [...SUPPORTED_COUNTRIES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );

  for (const c of sorted) {
    if (e164.startsWith(c.dialCode)) {
      return c.code;
    }
  }

  return DEFAULT_COUNTRY_CODE;
}

/**
 * Strip the country dial code from an E.164 number to get the local part.
 * Useful for displaying the number in a local format.
 */
export function getLocalNumber(e164: string, countryCode: string): string {
  const country = getCountry(countryCode);
  if (!country) return e164;

  if (e164.startsWith(country.dialCode)) {
    return e164.slice(country.dialCode.length);
  }
  return e164;
}
