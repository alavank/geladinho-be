'use client';

import { useEffect } from 'react';

const SCRIPT_ID = 'google-maps-script';

export default function GoogleMapsLoader({ apiKey }: { apiKey: string }) {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID) || window.google?.maps) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, [apiKey]);

  return null;
}
