import { createHttpClient } from '@/lib/httpClient';
import { httpDevices } from '../devices.repo';

function mockFetch(handler: (url: string, init?: RequestInit) => unknown | Promise<unknown>) {
  return handler as unknown as typeof fetch;
}

test('register POSTs /me/devices with a snake_case body', async () => {
  const calls: { url: string; method?: string; body: unknown }[] = [];
  const http = createHttpClient({
    baseUrl: 'https://api.test/v1',
    getAuth: () => ({ accessToken: 't', tenantId: 'tenant-1' }),
    fetchImpl: mockFetch(async (url, init) => {
      calls.push({
        url: String(url),
        method: init?.method,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      });
      return { ok: true, status: 200, statusText: 'OK', json: async () => ({ data: null }) };
    }),
  });

  await httpDevices(http).register({ expoPushToken: 'ExponentPushToken[x]', platform: 'ios' });

  expect(calls).toHaveLength(1);
  expect(calls[0].url).toContain('/me/devices');
  expect(calls[0].method).toBe('POST');
  expect(calls[0].body).toEqual({ expo_push_token: 'ExponentPushToken[x]', platform: 'ios' });
});
