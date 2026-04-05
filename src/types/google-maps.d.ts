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

interface GoogleMapsPlaceAddressComponent {
  longText?: string;
  shortText?: string;
  long_name?: string;
  short_name?: string;
  types: string[];
}

interface GoogleMapsPlace {
  addressComponents?: GoogleMapsPlaceAddressComponent[];
  fetchFields: (request: { fields: string[] }) => Promise<void>;
}

interface GoogleMapsPlacePrediction {
  toPlace: () => GoogleMapsPlace;
}

interface GoogleMapsPlacePredictionSelectEvent extends Event {
  place?: GoogleMapsPlace;
  placePrediction?: GoogleMapsPlacePrediction;
}

interface GoogleMapsPlaceAutocompleteElement extends HTMLElement {
  className: string;
  includedPrimaryTypes?: string[];
  includedRegionCodes?: string[];
  placeholder: string;
  requestedRegion?: string;
  value: string;
}

interface GoogleMapsPlacesLibrary {
  PlaceAutocompleteElement: new (opts?: {
    includedPrimaryTypes?: string[];
    includedRegionCodes?: string[];
    placeholder?: string;
    requestedRegion?: string;
  }) => GoogleMapsPlaceAutocompleteElement;
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
      importLibrary: (name: string) => Promise<unknown>;
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
