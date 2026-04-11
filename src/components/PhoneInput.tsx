'use client';

import { useState, useRef, useEffect } from 'react';
import { SUPPORTED_COUNTRIES, CountryPhone, getFlagUrl } from '@/lib/phone';

interface Props {
  value: string;
  countryCode: string;
  onChangePhone: (phone: string) => void;
  onChangeCountry: (code: string) => void;
  className?: string;
  invalid?: boolean;
  placeholder?: string;
}

function Flag({ code, size = 20 }: { code: string; size?: number }) {
  return (
    <img
      src={getFlagUrl(code)}
      alt={code}
      width={size}
      height={Math.round(size * 0.75)}
      className="inline-block rounded-sm object-cover"
      style={{ width: size, height: Math.round(size * 0.75) }}
    />
  );
}

export default function PhoneInput({
  value,
  countryCode,
  onChangePhone,
  onChangeCountry,
  className = '',
  invalid = false,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode) || SUPPORTED_COUNTRIES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (country: CountryPhone) => {
    onChangeCountry(country.code);
    setOpen(false);
  };

  const defaultPlaceholder = placeholder || getPlaceholder(selected);

  return (
    <div className={`relative flex ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-l-xl border-2 border-r-0 px-3 py-3 text-sm font-semibold transition-colors hover:bg-gray-50 ${
          invalid
            ? 'border-red-400 bg-red-50'
            : 'border-gray-200 bg-gray-50'
        }`}
        title={selected.name}
      >
        <Flag code={selected.code} size={20} />
        <span className="text-gray-700 text-xs font-bold">{selected.code}</span>
        <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <input
        type="tel"
        className={`min-w-0 flex-1 rounded-r-xl border-2 px-4 py-3 text-base outline-none transition-all focus:ring-2 focus:ring-brand-400 ${
          invalid
            ? 'border-red-400 focus:ring-red-400'
            : 'border-gray-200'
        }`}
        placeholder={defaultPlaceholder}
        value={value}
        onChange={(e) => onChangePhone(e.target.value)}
      />

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-xl border border-gray-200 bg-white shadow-lg">
          {SUPPORTED_COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleSelect(country)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl ${
                country.code === countryCode ? 'bg-brand-50 font-semibold text-brand-700' : 'text-gray-700'
              }`}
            >
              <Flag code={country.code} size={22} />
              <span className="w-7 text-xs font-bold text-gray-500">{country.code}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-xs text-gray-400">{country.dialCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getPlaceholder(country: CountryPhone): string {
  switch (country.code) {
    case 'BE': return '470 12 34 56';
    case 'LU': return '621 123 456';
    case 'FR': return '6 12 34 56 78';
    case 'NL': return '6 12345678';
    case 'DE': return '170 1234567';
    case 'PT': return '912 345 678';
    default: return '';
  }
}
