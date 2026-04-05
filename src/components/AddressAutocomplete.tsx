'use client';

import { useEffect, useRef, useState } from 'react';
import { formatFullAddress } from '@/lib/address';

interface AddressResult {
  fullAddress: string;
  street: string;
  number: string;
  postalCode: string;
  city: string;
}

interface Props {
  value: string;
  onChange: (value: string, meta?: { selected?: boolean }) => void;
  onAddressSelected?: (address: AddressResult) => void;
  placeholder?: string;
  className?: string;
  invalid?: boolean;
}

function getAddressComponent(components: GoogleMapsPlaceAddressComponent[], type: string) {
  const component = components.find((item) => item.types.includes(type));
  return component?.longText || component?.long_name || '';
}

function getPredictionText(prediction: GoogleMapsPlacePrediction) {
  return prediction.text?.toString?.() || '';
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  placeholder,
  className,
  invalid = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLibRef = useRef<GoogleMapsPlacesLibrary | null>(null);
  const sessionTokenRef = useRef<GoogleMapsAutocompleteSessionToken | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const skipNextFetchRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onAddressSelectedRef = useRef(onAddressSelected);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GoogleMapsAutocompleteSuggestionItem[]>([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onAddressSelectedRef.current = onAddressSelected;
  }, [onAddressSelected]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const markReady = () => setReady(true);

    const check = () => {
      if (window.google?.maps?.places) {
        setReady(true);
        return;
      }
      timeoutId = setTimeout(check, 200);
    };

    window.addEventListener('google-maps-ready', markReady);
    check();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('google-maps-ready', markReady);
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.google?.maps?.importLibrary) return;

    const loadLibrary = async () => {
      try {
        placesLibRef.current = await window.google!.maps.importLibrary('places') as GoogleMapsPlacesLibrary;
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      } catch (error) {
        console.error('Erro ao inicializar autocomplete do Google Maps:', error);
      }
    };

    void loadLibrary();
  }, [ready]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!inputRef.current) return;
      const container = inputRef.current.closest('[data-address-autocomplete-root]');
      if (container && !container.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!ready || !placesLibRef.current) return;

    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }

    const query = value.trim();

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);

      try {
        const placesLib = placesLibRef.current!;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }

        const { suggestions: nextSuggestions = [] } =
          await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            includedPrimaryTypes: ['street_address'],
            includedRegionCodes: ['be'],
            language: 'fr',
            region: 'be',
            sessionToken: sessionTokenRef.current,
          });

        if (requestIdRef.current !== currentRequestId) return;

        setSuggestions(nextSuggestions.filter((item) => !!item.placePrediction));
        setOpen(true);
      } catch (error) {
        console.error('Erro ao buscar sugestões de endereço:', error);
        if (requestIdRef.current === currentRequestId) {
          setSuggestions([]);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setLoading(false);
        }
      }
    }, 180);
  }, [ready, value]);

  const handleInputChange = (nextValue: string) => {
    onChangeRef.current(nextValue, { selected: false });
    setOpen(true);
  };

  const handleSuggestionSelect = async (prediction: GoogleMapsPlacePrediction) => {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ['addressComponents', 'formattedAddress'] });

      const components = place.addressComponents || [];
      const street = getAddressComponent(components, 'route');
      const number = getAddressComponent(components, 'street_number');
      const postalCode = getAddressComponent(components, 'postal_code');
      const city =
        getAddressComponent(components, 'locality') ||
        getAddressComponent(components, 'postal_town') ||
        getAddressComponent(components, 'sublocality_level_1') ||
        getAddressComponent(components, 'administrative_area_level_2');

      const fullAddress =
        place.formattedAddress ||
        formatFullAddress({ street, number, postalCode, city, country: 'Belgique' }) ||
        getPredictionText(prediction);

      skipNextFetchRef.current = true;
      onChangeRef.current(fullAddress, { selected: true });
      onAddressSelectedRef.current?.({
        fullAddress,
        street,
        number,
        postalCode,
        city,
      });
      setSuggestions([]);
      setOpen(false);

      if (placesLibRef.current) {
        sessionTokenRef.current = new placesLibRef.current.AutocompleteSessionToken();
      }
    } catch (error) {
      console.error('Erro ao selecionar endereço:', error);
    }
  };

  return (
    <div className={['relative', className || ''].filter(Boolean).join(' ')} data-address-autocomplete-root>
      <input
        ref={inputRef}
        type="text"
        autoComplete="street-address"
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        placeholder={placeholder}
        className={`input-field ${invalid ? 'border-red-400 focus:ring-red-400' : ''}`}
      />

      {open && (loading || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0_14px_34px_-18px_rgba(15,23,42,0.45)]">
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-400">Buscando endereços...</div>
          )}

          {!loading && suggestions.length > 0 && (
            <>
              <div className="max-h-64 overflow-y-auto py-1">
                {suggestions.map((item, index) => {
                  const label = getPredictionText(item.placePrediction);
                  return (
                    <button
                      key={`${label}-${index}`}
                      type="button"
                      className="block w-full border-0 bg-white px-3 py-2.5 text-left text-sm leading-5 text-gray-700 transition-colors hover:bg-gray-50"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        void handleSuggestionSelect(item.placePrediction);
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-3 py-1.5">
                <img
                  src="https://storage.googleapis.com/geo-devrel-public-buckets/powered_by_google_on_white.png"
                  alt="Powered by Google"
                  className="h-3 w-auto opacity-75"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
