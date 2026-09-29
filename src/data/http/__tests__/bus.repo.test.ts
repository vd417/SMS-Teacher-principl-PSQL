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

test('BUS-01: assignedBus parses the response through a zod schema — a malformed row is rejected, not silently cast', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      // bus_no missing entirely — a TS cast would pass this through silently.
      json: async () => ({ data: { id: 'b1', stops: [] } }),
    })),
  });

  await expect(httpBus(http).assignedBus()).rejects.toThrow();
});

test('BUS-01: assignedBus maps route_id (A-7) and tolerates a null stop time (SD-3, routed bus)', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: {
          id: 'cb64ef53-346c-5fd3-bd39-46507f208dae',
          bus_no: 'DS-01',
          route_id: 'route-1',
          route_name: 'Dev Seed Route 1',
          driver: 'Dev Seed Driver',
          driver_phone: '+919000000999',
          stops: [
            {
              id: '800ed402-0cfb-5e7b-9950-115ae0eec897',
              name: 'Shivaji Nagar',
              time: null,
              seq: 1,
              lat: 18.5308,
              lng: 73.8475,
            },
          ],
        },
      }),
    })),
  });

  const bus = await httpBus(http).assignedBus();

  expect(bus.routeId).toBe('route-1');
  expect(bus.stops[0].time).toBeNull();
});

test('BUS-02: position parses through a zod schema and tolerates null lat/lng/next_stop_name/eta_minutes (no live trip)', async () => {
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
          lat: null,
          lng: null,
          next_stop_name: null,
          eta_minutes: null,
        },
      }),
    })),
  });

  const position = await httpBus(http).position('b1');

  expect(position.lat).toBeUndefined();
  expect(position.lng).toBeUndefined();
  expect(position.nextStopName).toBeUndefined();
  expect(position.etaMinutes).toBeUndefined();
});

test('BUS-03: roster maps a driver-written "dropped" boarding state to the app boarded status (approved at CHECKPOINT 2)', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: [
          {
            student_id: 's1',
            student_name: 'Aarav Shah',
            initials: 'AS',
            stop_id: 'stop-1',
            status: 'dropped',
          },
        ],
      }),
    })),
  });

  const roster = await httpBus(http).roster('b1');

  expect(roster[0].status).toBe('boarded');
});

test('BUS-05: myRoutes maps route_id (A-7)', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: [
          {
            id: 'b1',
            bus_no: 'WBA-01',
            route_id: 'route-9',
            route_name: 'North Loop',
            driver: 'Ravi',
            driver_phone: '999',
            stops: [],
          },
        ],
      }),
    })),
  });

  const rows = await httpBus(http).myRoutes();

  expect(rows[0].routeId).toBe('route-9');
});
