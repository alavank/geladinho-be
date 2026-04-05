'use client';

import { useEffect } from 'react';

const SCRIPT_ID = 'google-maps-script';

export default function GoogleMapsLoader() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID) || window.google?.maps) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
    if (!apiKey) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  return null;
}
