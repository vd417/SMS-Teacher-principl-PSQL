import { httpAuth } from '../auth.repo';
import type { HttpClient } from '@/lib/httpClient';

// Records every POST so we can assert path + body. /auth/me returns a minimal identity
// so the token→session path resolves.
function recordingHttp() {
  const calls: { path: string; body: unknown }[] = [];
  const http = {
    get: async (path: string) =>
      path === '/auth/me' ? { id: 'u1', tenant_id: 't1', roles: ['teacher'] } : undefined,
    getList: async () => ({ items: [], nextCursor: null }),
    post: async (path: string, body: unknown) => {
      calls.push({ path, body });
      if (path === '/auth/login' || path === '/auth/otp/verify')
        return { access_token: 'a', refresh_token: 'r' };
      return undefined;
    },
    put: async () => undefined,
    patch: async () => undefined,
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
