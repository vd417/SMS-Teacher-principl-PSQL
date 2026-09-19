import { createHttpClient } from '@/lib/httpClient';
import { httpRouteGeometry } from '../routeGeometry.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

test('get maps the enveloped snake_case wire response to a camelCase RouteGeometryDTO', async () => {
  const requestedUrls: string[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url) => {
      requestedUrls.push(String(url));
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          data: {
            route_id: 'r1',
            status: 'available',
            format: 'google-encoded-polyline',
            geometry: 'abc',
            distance_meters: 4210,
            duration_seconds: 780,
            stop_sequence_hash: 'sha256:h',
            generated_at: '2026-09-19T10:00:00Z',
          },
        }),
      };
    }),
  });

  const result = await httpRouteGeometry(http).get('r1');

  expect(requestedUrls[0]).toMatch(/\/transport\/routes\/r1\/geometry$/);
  expect(result).toEqual({
    routeId: 'r1',
    status: 'available',
    format: 'google-encoded-polyline',
    geometry: 'abc',
    distanceMeters: 4210,
    durationSeconds: 780,
    stopSequenceHash: 'sha256:h',
    generatedAt: '2026-09-19T10:00:00Z',
  });
});

test('get tolerates an unavailable route with null geometry fields', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: {
          route_id: 'r2',
          status: 'unavailable',
          format: null,
          geometry: null,
          distance_meters: null,
          duration_seconds: null,
          stop_sequence_hash: 'sha256:h2',
          generated_at: null,
        },
      }),
    })),
  });

  const result = await httpRouteGeometry(http).get('r2');

  expect(result.status).toBe('unavailable');
  expect(result.geometry).toBeNull();
  expect(result.distanceMeters).toBeNull();
});
