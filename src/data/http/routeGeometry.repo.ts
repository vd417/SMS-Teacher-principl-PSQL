import type { HttpClient } from '@/lib/httpClient';

// Wire shape returned by GET /transport/routes/{routeId}/geometry, snake_case, already
// unwrapped from the `{ data: ... }` envelope by HttpClient.get (see httpClient.ts's
// maybeData/unwrapData). Mirrors bus.repo.ts's *DTO-suffixed-raw-shape convention.
interface RouteGeometryRawDTO {
  route_id: string;
  status: 'available' | 'unavailable';
  format: string | null;
  geometry: string | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  stop_sequence_hash: string;
  generated_at: string | null;
}

export interface RouteGeometryDTO {
  routeId: string;
  status: 'available' | 'unavailable';
  format: string | null;
  geometry: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  stopSequenceHash: string;
  generatedAt: string | null;
}

const toRouteGeometry = (d: RouteGeometryRawDTO): RouteGeometryDTO => ({
  routeId: d.route_id,
  status: d.status,
  format: d.format,
  geometry: d.geometry,
  distanceMeters: d.distance_meters,
  durationSeconds: d.duration_seconds,
  stopSequenceHash: d.stop_sequence_hash,
  generatedAt: d.generated_at,
});

export function httpRouteGeometry(http: HttpClient) {
  return {
    get: (routeId: string): Promise<RouteGeometryDTO> =>
      http.get<RouteGeometryRawDTO>(`/transport/routes/${routeId}/geometry`).then(toRouteGeometry),
  };
}
