import { createHttpClient } from '@/lib/httpClient';
import { httpMyAttendance } from '../myAttendance.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

test('MYA-01: schoolLocation parses the response through a zod schema — a malformed row is rejected, not silently cast', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      // lat missing entirely — a TS cast would pass this through silently.
      json: async () => ({ data: { lng: 73.8567, radius_meters: 200, name: 'Campus' } }),
    })),
  });

  await expect(httpMyAttendance(http).schoolLocation()).rejects.toThrow();
});

test('MYA-01: schoolLocation parses a real response', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        data: { lat: 18.5204, lng: 73.8567, radius_meters: 200, name: 'Dev Seed Campus' },
      }),
    })),
  });

  const loc = await httpMyAttendance(http).schoolLocation();
  expect(loc).toEqual({ lat: 18.5204, lng: 73.8567, radiusMeters: 200, name: 'Dev Seed Campus' });
});

test('MYA-02: today tolerates null check_in/check_out (nothing punched yet)', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: { date: '2026-09-25', check_in: null, check_out: null } }),
    })),
  });

  const day = await httpMyAttendance(http).today();
  expect(day).toEqual({ date: '2026-09-25', checkIn: undefined, checkOut: undefined });
});

test('MYA-04: summary parses the response through a zod schema', async () => {
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ data: { days_present: 0, days_flagged: 0, total_hours: 0 } }),
    })),
  });

  const summary = await httpMyAttendance(http).summary('2026-09');
  expect(summary).toEqual({ daysPresent: 0, daysFlagged: 0, totalHours: 0 });
});
