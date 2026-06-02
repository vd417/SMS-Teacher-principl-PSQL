import { myAttendanceContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockMyAttendance } from '@/data/mock/myAttendance.repo';
import { httpMyAttendance } from '@/data/http/myAttendance.repo';
import { createHttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mutable fixture so punch → today round-trips in the http contract.
let todayDay: { date: string; check_in?: unknown; check_out?: unknown } = {
  date: new Date().toISOString().slice(0, 10),
};

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const urlStr = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';

  const ok = (body: unknown, status = 200): Response =>
    ({
      ok: true,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;

  if (method === 'POST' && urlStr.includes('/me/attendance/punch')) {
    const ev = JSON.parse(String(init?.body ?? '{}'));
    todayDay = {
      date: String(ev.at).slice(0, 10),
      check_in: ev.kind === 'in' ? ev : todayDay.check_in,
      check_out: ev.kind === 'out' ? ev : todayDay.check_out,
    };
    return ok(todayDay);
  }
  if (urlStr.includes('/me/attendance/school-location')) {
    return ok({ lat: 40.0, lng: -75.0, radius_meters: 10, name: 'HTTP School' });
  }
  if (urlStr.includes('/me/attendance/today')) {
    return ok(todayDay);
  }
  if (urlStr.includes('/me/attendance/history')) {
    return ok([{ date: '2026-05-29' }, { date: '2026-05-28' }]);
  }
  if (urlStr.includes('/me/attendance/summary')) {
    return ok({ days_present: 2, days_flagged: 1, total_hours: 14.5 });
  }
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' } as Response;
}) as unknown as typeof fetch;

myAttendanceContract('mock', async () => mockMyAttendance(await createStore()));
myAttendanceContract('http', async () =>
  httpMyAttendance(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
