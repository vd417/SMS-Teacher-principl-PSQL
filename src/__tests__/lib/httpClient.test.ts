import { createHttpClient } from '@/lib/httpClient';
import { AppError } from '@/lib/errors';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response);
}

describe('httpClient', () => {
  it('attaches auth and tenant headers from the provider', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ ok: true }));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: 'tok', tenantId: 'school1' }),
      fetchImpl: fetchMock,
    });
    await http.get('/classes');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/classes');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect((init.headers as Record<string, string>)['X-Tenant-Id']).toBe('school1');
  });

  it('normalizes non-2xx to AppError', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ message: 'bad' }, 404));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await expect(http.get('/x')).rejects.toBeInstanceOf(AppError);
  });
});
