/* eslint-disable @typescript-eslint/no-explicit-any */

interface GoogleMapsPlacesAutocomplete {
  addListener: (event: string, callback: () => void) => void;
  getPlace: () => {
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  };
}

interface GoogleMap {
  fitBounds: (bounds: GoogleMapsBounds) => void;
  setCenter: (pos: { lat: number; lng: number }) => void;
  setZoom: (z: number) => void;
}

interface GoogleMapsMarker {
  addListener: (event: string, callback: () => void) => void;
  setMap: (map: GoogleMap | null) => void;
}

interface GoogleMapsInfoWindow {
  open: (map: GoogleMap, marker: GoogleMapsMarker) => void;
  close: () => void;
  setContent: (content: string) => void;
}

interface GoogleMapsBounds {
  extend: (pos: { lat: number; lng: number }) => void;
}

interface Window {
  google?: {
    maps: {
      Map: new (el: HTMLElement, opts: Record<string, unknown>) => GoogleMap;
      Marker: new (opts: Record<string, unknown>) => GoogleMapsMarker;
      InfoWindow: new (opts: Record<string, unknown>) => GoogleMapsInfoWindow;
      LatLngBounds: new () => GoogleMapsBounds;
      places: {
        Autocomplete: new (
          input: HTMLInputElement,
          opts: Record<string, unknown>
        ) => GoogleMapsPlacesAutocomplete;
      };
    };
  };
}
