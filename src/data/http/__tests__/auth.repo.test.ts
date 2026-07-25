import { httpAuth } from '../auth.repo';
import { createHttpClient, type HttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';

// Records every POST so we can assert path + body. /auth/me returns a minimal identity
// so the token→session path resolves.
function recordingHttp() {
  const calls: { path: string; body: unknown }[] = [];
  const http = {
    get: async (path: string) =>
      path === '/auth/me' ? { id: 'u1', tenant_id: 't1', roles: ['teacher'] } : undefined,
    getList: async (path: string) =>
      path === '/me/schools'
        ? {
            items: [
              { id: 't1', name: 'School One', logo_url: 'https://cdn.example.com/one.png' },
              { id: 't2', name: 'School Two' },
            ],
            nextCursor: null,
          }
        : { items: [], nextCursor: null },
    post: async (path: string, body: unknown) => {
      calls.push({ path, body });
      if (path === '/auth/login' || path === '/auth/otp/verify' || path === '/me/switch-school')
        return { access_token: 'a', refresh_token: 'r' };
      return undefined;
    },
    put: async () => undefined,
    patch: async (path: string, body: unknown) => {
      calls.push({ path, body });
      return undefined;
    },
    delete: async () => undefined,
  } as unknown as HttpClient;
  return { http, calls };
}

test('login routes an email identifier to the email field', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).login('asha@x.com', 'secret123');
  expect(calls[0]).toEqual({
    path: '/auth/login',
    body: { email: 'asha@x.com', password: 'secret123' },
  });
});

test('login routes a phone identifier to the phone field', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).login('9876540118', 'secret123');
  expect(calls[0]).toEqual({
    path: '/auth/login',
    body: { phone: '9876540118', password: 'secret123' },
  });
});

test('forgotPassword posts the identifier', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).forgotPassword('asha@x.com');
  expect(calls[0]).toEqual({ path: '/auth/password/forgot', body: { identifier: 'asha@x.com' } });
});

test('resetPassword posts identifier, code and new password', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).resetPassword('asha@x.com', '123456', 'newpass12');
  expect(calls[0]).toEqual({
    path: '/auth/password/reset',
    body: { identifier: 'asha@x.com', code: '123456', password: 'newpass12' },
  });
});

test('setPassword posts only the new password', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).setPassword('newpass12');
  expect(calls[0]).toEqual({ path: '/auth/set-password', body: { password: 'newpass12' } });
});

test('listMySchools maps the paginated /me/schools rows to id/name/logoUrl', async () => {
  const { http } = recordingHttp();
  const schools = await httpAuth(http).listMySchools();
  expect(schools).toEqual([
    { id: 't1', name: 'School One', logoUrl: 'https://cdn.example.com/one.png' },
    { id: 't2', name: 'School Two', logoUrl: null },
  ]);
});

test('updatePhoto patches /me/photo with photo_url', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).updatePhoto('https://cdn.example.com/a.png');
  expect(calls[0]).toEqual({
    path: '/me/photo',
    body: { photo_url: 'https://cdn.example.com/a.png' },
  });
});

test('updatePhoto with null clears the photo', async () => {
  const { http, calls } = recordingHttp();
  await httpAuth(http).updatePhoto(null);
  expect(calls[0]).toEqual({ path: '/me/photo', body: { photo_url: null } });
});

test('switchSchool posts tenant_id and resolves a full session via /auth/me', async () => {
  const { http, calls } = recordingHttp();
  const session = await httpAuth(http).switchSchool('t2');
  expect(calls[0]).toEqual({ path: '/me/switch-school', body: { tenant_id: 't2' } });
  expect(session.tenant.id).toBe('t1'); // recordingHttp's /auth/me always returns tenant_id: 't1'
  expect(session.accessToken).toBe('a');
});

// The recordingHttp() harness above replaces HttpClient entirely and never
// exercises header/tenant resolution. These tests use the real createHttpClient
// against a stubbed fetch so they can assert on the X-Tenant-Id header the live
// httpClient sends — the thing that actually 403s against the backend's
// TenantResolutionMiddleware when it disagrees with the JWT's tenant_id claim.
describe('switchSchool against the real httpClient (tenant header resolution)', () => {
  afterEach(() => authSnapshot.clear());

  function jsonResponse(body: unknown, status = 200): Response {
    return { ok: status < 400, status, statusText: '', json: async () => body } as Response;
  }

  test('the /auth/me follow-up carries the target tenant, not the tenant active before the switch', async () => {
    authSnapshot.set({ accessToken: 'old-token', tenantId: 't1' });
    const fetchMock = jest.fn(async (url: string, _init?: RequestInit) => {
      if (url.endsWith('/me/switch-school')) {
        return jsonResponse({ data: { access_token: 'new-token', refresh_token: 'r2' } });
      }
      if (url.endsWith('/auth/me')) {
        return jsonResponse({ data: { id: 'u1', tenant_id: 't2', roles: ['teacher'] } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const http = createHttpClient({
      baseUrl: '',
      getAuth: () => authSnapshot.get(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const session = await httpAuth(http).switchSchool('t2');

    const meCall = fetchMock.mock.calls.find(([url]) => url.endsWith('/auth/me'));
    expect(meCall).toBeTruthy();
    const headers = (meCall![1] as unknown as { headers: Record<string, string> }).headers;
    expect(headers['X-Tenant-Id']).toBe('t2');
    expect(session.tenant.id).toBe('t2');
  });

  test('a failed switch restores the pre-switch snapshot instead of poisoning it', async () => {
    authSnapshot.set({ accessToken: 'old-token', tenantId: 't1' });
    const fetchMock = jest.fn(async (url: string) => {
      if (url.endsWith('/me/switch-school')) {
        return jsonResponse({ data: { access_token: 'new-token', refresh_token: 'r2' } });
      }
      if (url.endsWith('/auth/me')) {
        return jsonResponse({ error: { code: 'forbidden', message: 'tenant mismatch' } }, 403);
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
    const http = createHttpClient({
      baseUrl: '',
      getAuth: () => authSnapshot.get(),
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(httpAuth(http).switchSchool('t2')).rejects.toBeTruthy();

    // Snapshot must be exactly what it was before switchSchool was called — not
    // the new access token paired with a tenant that can't resolve, which would
    // 403 every subsequent request (including a retry) until the app restarts.
    expect(authSnapshot.get()).toEqual({ accessToken: 'old-token', tenantId: 't1' });
  });
});
