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
  invalid?: boolean;
}

function getAddressComponent(
  components: GoogleMapsPlaceAddressComponent[],
  type: string
) {
  const component = components.find((item) => item.types.includes(type));
  return component?.longText || component?.long_name || '';
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelected,
  placeholder,
  className,
  invalid = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<GoogleMapsPlaceAutocompleteElement | null>(null);
  const onChangeRef = useRef(onChange);
  const onAddressSelectedRef = useRef(onAddressSelected);
  const [ready, setReady] = useState(false);

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
    if (!ready || !containerRef.current || elementRef.current || !window.google?.maps?.importLibrary) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      try {
        const placesLib = await window.google!.maps.importLibrary('places') as GoogleMapsPlacesLibrary;
        if (cancelled || !containerRef.current) return;

        const element = new placesLib.PlaceAutocompleteElement({
          includedPrimaryTypes: ['street_address'],
          includedRegionCodes: ['be'],
          placeholder: placeholder || '',
          requestedRegion: 'be',
        });

        element.className = 'gmp-address-autocomplete';
        element.value = value;

        const handleInput = () => {
          onChangeRef.current(element.value || '');
        };

        const handleSelect = async (event: Event) => {
          const customEvent = event as GoogleMapsPlacePredictionSelectEvent;
          const place =
            customEvent.place ||
            customEvent.placePrediction?.toPlace?.();

          if (!place) return;

          await place.fetchFields({ fields: ['addressComponents'] });

          const components = place.addressComponents || [];
          const result: AddressResult = {
            street: getAddressComponent(components, 'route'),
            number: getAddressComponent(components, 'street_number'),
            postalCode: getAddressComponent(components, 'postal_code'),
            city:
              getAddressComponent(components, 'locality') ||
              getAddressComponent(components, 'postal_town') ||
              getAddressComponent(components, 'sublocality_level_1') ||
              getAddressComponent(components, 'administrative_area_level_2'),
          };

          onChangeRef.current(result.street || element.value || '');
          onAddressSelectedRef.current?.(result);
        };

        const handleError = () => {
          console.error('Falha no PlaceAutocompleteElement do Google Maps.');
        };

        element.addEventListener('input', handleInput);
        element.addEventListener('change', handleInput);
        element.addEventListener('gmp-select', handleSelect as EventListener);
        element.addEventListener('gmp-error', handleError);

        containerRef.current.replaceChildren(element);
        elementRef.current = element;

        cleanup = () => {
          element.removeEventListener('input', handleInput);
          element.removeEventListener('change', handleInput);
          element.removeEventListener('gmp-select', handleSelect as EventListener);
          element.removeEventListener('gmp-error', handleError);
          if (element.parentNode) element.parentNode.removeChild(element);
          if (elementRef.current === element) elementRef.current = null;
        };
      } catch (error) {
        console.error('Erro ao inicializar PlaceAutocompleteElement:', error);
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [ready]);

  useEffect(() => {
    if (elementRef.current && elementRef.current.value !== value) {
      elementRef.current.value = value;
    }
  }, [value]);

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.placeholder = placeholder || '';
    }
  }, [placeholder]);

  return (
    <div
      className={[
        'gmp-address-autocomplete-shell',
        invalid ? 'gmp-address-autocomplete-shell--invalid' : '',
        className || '',
      ].filter(Boolean).join(' ')}
    >
      <div ref={containerRef} />
    </div>
  );
}
