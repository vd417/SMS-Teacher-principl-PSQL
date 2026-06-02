import { busContract } from './contract';
import { createStore } from '@/data/mock/store';
import { mockBus } from '@/data/mock/bus.repo';
import { httpBus } from '@/data/http/bus.repo';
import { createHttpClient } from '@/lib/httpClient';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@/lib/latency', () => ({ simulateLatency: () => Promise.resolve() }));

const BUS = {
  id: 'bus_north',
  number: 'WBA-07',
  route_name: 'North Loop',
  driver: 'Marcus Bell',
  driver_phone: '+1 (415) 555-0142',
  stops: [
    { id: 'stop_1', name: 'Campus', time: '07:30', order: 0, lat: 37.78, lng: -122.4 },
    { id: 'stop_2', name: 'Oak Street', time: '07:42', order: 1, lat: 37.77, lng: -122.41 },
  ],
};
let rosterStore = [
  {
    student_id: 's1',
    student_name: 'Liam Carter',
    initials: 'LC',
    stop_id: 'stop_2',
    status: 'pending' as const,
  },
];

const fetchImpl = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
  const u = String(url);
  const method = init?.method?.toUpperCase() ?? 'GET';
  const ok = (body: unknown, status = 200) =>
    ({
      ok: true,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;

  if (method !== 'GET' && u.includes('/boarding')) {
    const parsed = JSON.parse(String(init?.body ?? '{}'));
    rosterStore = parsed.records;
    return ok(null, 204);
  }
  if (u.includes('/bus/assigned')) return ok(BUS);
  if (u.includes('/position')) {
    return ok({
      bus_id: 'bus_north',
      current_stop_index: 0,
      progress: 0.5,
      lat: 37.775,
      lng: -122.405,
      next_stop_name: 'Oak Street',
      eta_minutes: 4,
    });
  }
  if (u.includes('/roster')) return ok(rosterStore);
  return { ok: false, status: 404, json: async () => ({}), text: async () => 'nf' } as Response;
}) as unknown as typeof fetch;

busContract('mock', async () => mockBus(await createStore()));
busContract('http', async () =>
  httpBus(
    createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 't', tenantId: 's' }),
      fetchImpl,
    })
  )
);
