'use client';

import { useEffect } from 'react';

const SCRIPT_ID = 'google-maps-script';

export default function GoogleMapsLoader() {
  useEffect(() => {
    if (window.google?.maps?.places) {
      window.dispatchEvent(new Event('google-maps-ready'));
      return;
    }

    if (document.getElementById(SCRIPT_ID)) return;

    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    if (!apiKey) {
      console.warn(
        'Google Maps autocomplete desativado: configure NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ou NEXT_PUBLIC_GOOGLE_MAPS_KEY.'
      );
      window.dispatchEvent(new Event('google-maps-error'));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => window.dispatchEvent(new Event('google-maps-ready'));
    script.onerror = () => {
      console.error('Falha ao carregar Google Maps Places API.');
      window.dispatchEvent(new Event('google-maps-error'));
    };
    document.head.appendChild(script);
  }, []);

  return null;
}
