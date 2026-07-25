import type { AuthRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { authSnapshot } from '@/lib/authSnapshot';
import {
  tokenSchema,
  meSchema,
  schoolChoiceSchema,
  toSessionFromMe,
  toUserFromMe,
  maskIdentifier,
} from './auth.schema';

export function httpAuth(http: HttpClient): AuthRepository {
  // Login/OTP return tokens only; identity comes from /auth/me. We set the access
  // token into the snapshot first so the /me request carries the bearer.
  //
  // `tenantIdOverride` is used only by switchSchool: the new access token already
  // carries the *target* tenant in its JWT claim, and the backend's tenant
  // resolution middleware 403s any request whose X-Tenant-Id header disagrees
  // with that claim. login/verifyOtp have no target tenant yet, so they keep
  // whatever tenant was already in the snapshot (typically none) until /auth/me
  // resolves the real one.
  const sessionFromTokens = async (
    t: { accessToken: string; refreshToken: string },
    tenantIdOverride?: string
  ) => {
    authSnapshot.set({
      accessToken: t.accessToken,
      tenantId: tenantIdOverride ?? authSnapshot.get().tenantId,
    });
    const me = meSchema.parse(await http.get('/auth/me'));
    authSnapshot.set({ accessToken: t.accessToken, tenantId: me.tenant_id });
    return toSessionFromMe(t, me);
  };

  return {
    login: async (identifier, password) => {
      // Mirror sms-admin: an '@' routes the lookup to email, otherwise to phone.
      const body = identifier.includes('@')
        ? { email: identifier, password }
        : { phone: identifier, password };
      const t = tokenSchema.parse(await http.post('/auth/login', body));
      return sessionFromTokens({ accessToken: t.access_token, refreshToken: t.refresh_token });
    },
    verifyOtp: async (identifier, code) => {
      const t = tokenSchema.parse(await http.post('/auth/otp/verify', { identifier, code }));
      return sessionFromTokens({ accessToken: t.access_token, refreshToken: t.refresh_token });
    },
    requestOtp: async (identifier) => {
      await http.post('/auth/otp/request', { identifier });
      return {
        channel: identifier.includes('@') ? 'email' : 'sms',
        destination: maskIdentifier(identifier),
      };
    },
    refresh: async (refreshToken) => {
      const t = tokenSchema.parse(
        await http.post('/auth/refresh', { refresh_token: refreshToken })
      );
      return { accessToken: t.access_token, refreshToken: t.refresh_token };
    },
    me: async () => toUserFromMe(meSchema.parse(await http.get('/auth/me'))),
    logout: (refreshToken) => http.post('/auth/logout', { refresh_token: refreshToken }),
    forgotPassword: async (identifier) => {
      await http.post('/auth/password/forgot', { identifier });
    },
    resetPassword: async (identifier, code, password) => {
      await http.post('/auth/password/reset', { identifier, code, password });
    },
    setPassword: async (password) => {
      await http.post('/auth/set-password', { password });
    },
    listMySchools: async () => {
      const page = await http.getList<unknown>('/me/schools');
      return page.items.map((x) => schoolChoiceSchema.parse(x));
    },
    switchSchool: async (tenantId) => {
      const prevSnapshot = authSnapshot.get();
      try {
        const t = tokenSchema.parse(await http.post('/me/switch-school', { tenant_id: tenantId }));
        return await sessionFromTokens(
          { accessToken: t.access_token, refreshToken: t.refresh_token },
          tenantId
        );
      } catch (err) {
        // A failed switch (e.g. the /auth/me follow-up rejecting) must not leave
        // the snapshot holding a new token paired with a tenant that doesn't
        // resolve — that would 403 every subsequent request until app restart.
        authSnapshot.set(prevSnapshot);
        throw err;
      }
    },
  };
}
