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
  formattedAddress?: string;
  fetchFields: (request: { fields: string[] }) => Promise<void>;
}

interface GoogleMapsAutocompleteText {
  toString: () => string;
}

interface GoogleMapsPlacePrediction {
  text?: GoogleMapsAutocompleteText;
  toPlace: () => GoogleMapsPlace;
}

interface GoogleMapsAutocompleteSuggestionItem {
  placePrediction: GoogleMapsPlacePrediction;
}

interface GoogleMapsAutocompleteSessionToken {}

interface GoogleMapsPlacesLibrary {
  AutocompleteSessionToken: new () => GoogleMapsAutocompleteSessionToken;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      includedPrimaryTypes?: string[];
      includedRegionCodes?: string[];
      language?: string;
      region?: string;
      sessionToken?: GoogleMapsAutocompleteSessionToken;
    }) => Promise<{ suggestions?: GoogleMapsAutocompleteSuggestionItem[] }>;
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
