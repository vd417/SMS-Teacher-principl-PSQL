import { useJsApiLoader } from '@react-google-maps/api';
import { env } from '@/config/env';

// One loader id for every map on a screen. A second useJsApiLoader with a
// different id never finishes, which left the bus/fleet map on the fallback.
const LOADER = {
  id: 'google-map-script',
  googleMapsApiKey: env.GOOGLE_MAPS_API_KEY,
};

export function useGoogleMapsScript() {
  const loader = useJsApiLoader(LOADER);
  return {
    apiKey: env.GOOGLE_MAPS_API_KEY,
    mapId: env.GOOGLE_MAPS_MAP_ID,
    isLoaded: loader.isLoaded,
    loadError: loader.loadError,
  };
}

export function fitGoogleMap(map: google.maps.Map, points: { lat: number; lng: number }[]) {
  const finite = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (finite.length === 0) return;
  if (finite.length === 1) {
    map.setCenter(finite[0]);
    map.setZoom(15);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  for (const point of finite) bounds.extend(point);
  map.fitBounds(bounds, 48);
}
