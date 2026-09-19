import { createHttpClient } from '@/lib/httpClient';
import { httpBus } from '../bus.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

test('position maps speed_kmh and last_ping_at from the wire response', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: {
          bus_id: 'b1',
          current_stop_index: 2,
          progress: 0.4,
          lat: 12.97,
          lng: 77.59,
          speed_kmh: 28,
          next_stop_name: 'MG Road',
          eta_minutes: 6,
          last_ping_at: '2026-09-05T08:30:00Z',
        },
      }),
    })),
  });

  const position = await httpBus(http).position('b1');

  expect(position.speedKmh).toBe(28);
  expect(position.lastPingAt).toBe('2026-09-05T08:30:00Z');
  expect(position.nextStopName).toBe('MG Road');
});

test('position tolerates a missing speed_kmh/last_ping_at', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: {
          bus_id: 'b1',
          current_stop_index: 0,
          progress: 0,
          lat: 12.97,
          lng: 77.59,
          next_stop_name: 'MG Road',
          eta_minutes: 6,
        },
      }),
    })),
  });

  const position = await httpBus(http).position('b1');

  expect(position.speedKmh).toBeUndefined();
  expect(position.lastPingAt).toBeUndefined();
});

test('myRoutes maps buses this teacher is a traveling teacher on, via GET /bus/traveling', async () => {
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
          data: [
            {
              id: 'b1',
              bus_no: 'WBA-01',
              route_name: 'North Loop',
              driver: 'Ravi',
              driver_phone: '999',
              stops: [],
            },
            {
              id: 'b2',
              bus_no: 'WBA-02',
              route_name: null,
              driver: null,
              driver_phone: null,
              stops: [],
            },
          ],
        }),
      };
    }),
  });

  const rows = await httpBus(http).myRoutes();

  expect(requestedUrls[0]).toMatch(/\/bus\/traveling$/);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    busId: 'b1',
    busNo: 'WBA-01',
    routeName: 'North Loop',
    isDutyTeacher: false,
  });
  expect(rows[1]).toMatchObject({ busId: 'b2', busNo: 'WBA-02', isDutyTeacher: false });
});
