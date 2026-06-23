import { createHttpClient } from '@/lib/httpClient';

const mockAddBreadcrumb = jest.fn();
jest.mock('@/lib/sentry', () => ({
  addBreadcrumb: (...a: unknown[]) => mockAddBreadcrumb(...a),
}));

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    json: async () => body,
  } as unknown as Response;
}

describe('httpClient error breadcrumb', () => {
  beforeEach(() => mockAddBreadcrumb.mockClear());

  it('records a PII-free breadcrumb on a non-OK response', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(404, { error: { code: 'not_found', message: 'Missing' } })
    );
    const client = createHttpClient({
      baseUrl: 'https://x/v1',
      getAuth: () => ({ accessToken: 'secret-token', tenantId: 't1' }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(client.get('/classes')).rejects.toMatchObject({ status: 404 });
    expect(mockAddBreadcrumb).toHaveBeenCalledWith('http', {
      path: '/classes',
      status: 404,
      code: 'not_found',
    });
    const reported = JSON.stringify(mockAddBreadcrumb.mock.calls);
    expect(reported).not.toContain('secret-token');
  });
});
