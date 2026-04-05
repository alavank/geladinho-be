'use client';

import { useEffect, useRef, useState } from 'react';

interface AddressResult {
  street: string;
  number: string;
  postalCode: string;
  city: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onAddressSelected?: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
}

export default function AddressAutocomplete({ value, onChange, onAddressSelected, placeholder, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleMapsPlacesAutocomplete | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => {
      if (window.google?.maps?.places) {
        setReady(true);
        return;
      }
      setTimeout(check, 200);
    };
    check();
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;

    const autocomplete = new window.google!.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'be' },
      types: ['address'],
      fields: ['address_components'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      const get = (type: string) =>
        place.address_components!.find((c) => c.types.includes(type))?.long_name || '';

      const result: AddressResult = {
        street: get('route'),
        number: get('street_number'),
        postalCode: get('postal_code'),
        city: get('locality') || get('sublocality') || get('administrative_area_level_2'),
      };

      onChange(result.street);

      if (onAddressSelected) {
        onAddressSelected(result);
      }
    });

    autocompleteRef.current = autocomplete;
  }, [ready]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}
