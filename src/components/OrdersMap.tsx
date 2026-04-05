'use client';

import { useEffect, useRef, useState } from 'react';

interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  info: string;
  color: string;
}

interface Props {
  markers: MapMarker[];
  height?: string;
}

// Simple colored marker SVG
function markerIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function OrdersMap({ markers, height = '400px' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMapsMarker[]>([]);
  const [ready, setReady] = useState(false);

  // Wait for Google Maps
  useEffect(() => {
    const check = () => {
      if (window.google?.maps?.Map) { setReady(true); return; }
      setTimeout(check, 200);
    };
    check();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;

    mapInstanceRef.current = new window.google!.maps.Map(mapRef.current, {
      center: { lat: 50.85, lng: 4.35 }, // Brussels
      zoom: 8,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
  }, [ready]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (markers.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    const infoWindow = new window.google.maps.InfoWindow({ content: '' });

    markers.forEach((m) => {
      const marker = new window.google!.maps.Marker({
        position: { lat: m.lat, lng: m.lng },
        map: mapInstanceRef.current,
        title: m.title,
        icon: {
          url: markerIcon(m.color),
          scaledSize: { width: 24, height: 36 },
        },
      });

      marker.addListener('click', () => {
        infoWindow.close();
        infoWindow.setContent(
          `<div style="font-family:Inter,sans-serif;font-size:13px;max-width:200px">
            <strong>${m.title}</strong>
            <p style="margin:4px 0 0;color:#666">${m.info}</p>
          </div>`
        );
        infoWindow.open(mapInstanceRef.current!, marker);
      });

      bounds.extend({ lat: m.lat, lng: m.lng });
      markersRef.current.push(marker);
    });

    if (markers.length === 1) {
      mapInstanceRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      mapInstanceRef.current.setZoom(14);
    } else {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [markers, ready]);

  if (!ready) {
    return (
      <div style={{ height }} className="rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
        Carregando mapa...
      </div>
    );
  }

  return <div ref={mapRef} style={{ height }} className="rounded-xl border border-gray-200" />;
}
