const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export async function geocodeAddress(
  street: string,
  number: string,
  postalCode: string,
  city: string,
  country: string = 'Belgium'
): Promise<{ lat: number; lng: number } | null> {
  const apiKey =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  if (!apiKey) return null;

  const address = `${street} ${number}, ${postalCode} ${city}, ${country}`;

  try {
    const res = await fetch(
      `${GEOCODING_URL}?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await res.json();

    if (data.status === 'OK' && data.results?.[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }

  return null;
}
