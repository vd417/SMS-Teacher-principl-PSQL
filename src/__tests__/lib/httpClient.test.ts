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
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ data: { ok: true } }));
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

  it('normalizes non-2xx to AppError with http_<status> code', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ message: 'bad' }, 404));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await expect(http.get('/x')).rejects.toMatchObject({
      code: 'http_404',
      status: 404,
      message: 'bad',
    });
  });

  it('omits auth/tenant headers when none are present', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ data: {} }, 200));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await http.get('/x');
    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers['X-Tenant-Id']).toBeUndefined();
  });

  it('appends query params, skipping null/undefined', async () => {
    const fetchMock = jest.fn().mockReturnValue(jsonResponse({ data: [] }, 200));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await http.get('/exams', { params: { status: 'upcoming', q: undefined } });
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.test/exams?status=upcoming');
  });

  it('returns undefined for 204 responses', async () => {
    const fetchMock = jest.fn().mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('no body')),
      } as unknown as Response)
    );
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await expect(http.delete('/exams/e1')).resolves.toBeUndefined();
  });

  it('wraps network failures as AppError code "network"', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('offline'));
    const http = createHttpClient({
      baseUrl: 'https://api.test',
      getAuth: () => ({ accessToken: null, tenantId: null }),
      fetchImpl: fetchMock,
    });
    await expect(http.get('/x')).rejects.toMatchObject({ code: 'network', status: 0 });
  });
});
