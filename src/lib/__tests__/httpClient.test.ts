import { createHttpClient } from '../httpClient';

function res(status: number, body: unknown): Response {
  return { ok: status < 400, status, statusText: '', json: async () => body } as Response;
}

test('get unwraps {data}', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => ({ accessToken: 'a', tenantId: 't' }),
    fetchImpl: async () => res(200, { data: { id: '1' } }),
  });
  expect(await http.get('/x')).toEqual({ id: '1' });
});

test('getList returns items + nextCursor', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => ({ accessToken: 'a', tenantId: 't' }),
    fetchImpl: async () => res(200, { data: [{ id: '1' }], next_cursor: 'c2' }),
  });
  expect(await http.getList('/x')).toEqual({ items: [{ id: '1' }], nextCursor: 'c2' });
});

test('error envelope maps to AppError code+message+details', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => ({ accessToken: 'a', tenantId: 't' }),
    fetchImpl: async () =>
      res(422, { error: { code: 'invalid_request', message: 'bad', details: { name: ['req'] } } }),
  });
  await expect(http.get('/x')).rejects.toMatchObject({
    code: 'invalid_request',
    status: 422,
    message: 'bad',
    details: { name: ['req'] },
  });
});

test('204 returns undefined without trying to unwrap', async () => {
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => ({ accessToken: 'a', tenantId: 't' }),
    fetchImpl: async () => res(204, undefined),
  });
  expect(await http.post('/logout', {})).toBeUndefined();
});

test('401 triggers a single refresh then retries once', async () => {
  let calls = 0;
  const auth = { accessToken: 'a', tenantId: 't' };
  const fetchImpl = (async () => {
    calls++;
    if (calls === 1) return res(401, { error: { code: 'unauthorized', message: 'no' } });
    return res(200, { data: { ok: true } });
  }) as unknown as typeof fetch;
  const onRefresh = jest.fn(async () => {
    auth.accessToken = 'a2';
    return true;
  });
  const http = createHttpClient({ baseUrl: '', getAuth: () => auth, fetchImpl, onRefresh });
  expect(await http.get('/x')).toEqual({ ok: true });
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(calls).toBe(2);
});

test('refresh failure calls onAuthLost and throws', async () => {
  const onAuthLost = jest.fn();
  const http = createHttpClient({
    baseUrl: '',
    getAuth: () => ({ accessToken: 'a', tenantId: 't' }),
    fetchImpl: async () => res(401, { error: { code: 'unauthorized', message: 'no' } }),
    onRefresh: async () => false,
    onAuthLost,
  });
  await expect(http.get('/x')).rejects.toBeTruthy();
  expect(onAuthLost).toHaveBeenCalled();
});
