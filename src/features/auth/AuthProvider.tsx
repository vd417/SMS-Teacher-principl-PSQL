import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import type { OtpChallenge, SchoolChoice } from '@/data/repositories/types';
import { tokenStore } from '@/lib/tokenStore';
import { readJson, writeJson } from '@/lib/asyncStore';
import { authSnapshot } from '@/lib/authSnapshot';
import { authBridge } from '@/features/auth/authBridge';
import { queryClient } from '@/lib/queryClient';
import { useRepositories } from '@/data/repositories/RepositoryContext';

// User + tenant are persisted here; tokens live in SecureStore (tokenStore).
// Together they rehydrate a full Session across app restarts.
const SESSION_KEY = 'sd.session';

type Status = 'loading' | 'authenticated' | 'unauthenticated' | 'selecting-school';
interface AuthValue {
  status: Status;
  session: Session | null;
  pendingSchools: SchoolChoice[] | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  requestOtp: (identifier: string) => Promise<OtpChallenge>;
  signInWithOtp: (identifier: string, code: string) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<void>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  switchSchool: (tenantId: string) => Promise<void>;
  updatePhoto: (photoUrl: string | null) => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [pendingSchools, setPendingSchools] = useState<SchoolChoice[] | null>(null);

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.read();
      const stored = await readJson<Session | null>(SESSION_KEY, null);
      if (!tokens || !stored) {
        if (tokens) await tokenStore.clear();
        setStatus('unauthenticated');
        return;
      }
      try {
        // me() confirms the stored token is still valid and refreshes user data.
        const user = await repos.auth.me();
        const rehydrated: Session = { ...stored, ...tokens, user };
        authSnapshot.set({ accessToken: rehydrated.accessToken, tenantId: rehydrated.tenant.id });
        setSession(rehydrated);
        setStatus('authenticated');
      } catch {
        await tokenStore.clear();
        await writeJson<Session | null>(SESSION_KEY, null);
        setStatus('unauthenticated');
      }
    })();
  }, [repos]);

  const establishSession = useCallback(async (s: Session) => {
    await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
    await writeJson<Session>(SESSION_KEY, s);
    authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
    setSession(s);
    setStatus('authenticated');
  }, []);

  // Shared by signIn and signInWithOtp: once a login/OTP session is minted, check
  // whether the identity is linked to more than one school. A secondary-endpoint
  // failure here must not block sign-in — fall back to establishing the session
  // we already have.
  const continueAfterLogin = useCallback(
    async (s: Session) => {
      let schools: SchoolChoice[] = [];
      try {
        schools = await repos.auth.listMySchools();
      } catch {
        // fall back to single-school behavior below
      }
      if (schools.length > 1) {
        setPendingSchools(schools);
        setStatus('selecting-school');
        return;
      }
      await establishSession(s);
    },
    [repos, establishSession]
  );

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const s = await repos.auth.login(identifier, password);
      await continueAfterLogin(s);
    },
    [repos, continueAfterLogin]
  );

  const requestOtp = useCallback(
    (identifier: string) => repos.auth.requestOtp(identifier),
    [repos]
  );

  const signInWithOtp = useCallback(
    async (identifier: string, code: string) => {
      const s = await repos.auth.verifyOtp(identifier, code);
      await continueAfterLogin(s);
    },
    [repos, continueAfterLogin]
  );

  const switchSchool = useCallback(
    async (tenantId: string) => {
      const s = await repos.auth.switchSchool(tenantId);
      await establishSession(s);
      setPendingSchools(null);
    },
    [repos, establishSession]
  );

  const updatePhoto = useCallback(
    async (photoUrl: string | null) => {
      await repos.auth.updatePhoto(photoUrl);
      setSession((prev) => (prev ? { ...prev, user: { ...prev.user, photoUrl } } : prev));
    },
    [repos]
  );

  const forgotPassword = useCallback(
    (identifier: string) => repos.auth.forgotPassword(identifier),
    [repos]
  );

  const resetPassword = useCallback(
    (identifier: string, code: string, password: string) =>
      repos.auth.resetPassword(identifier, code, password),
    [repos]
  );

  const changePassword = useCallback(
    (password: string) => repos.auth.setPassword(password),
    [repos]
  );

  const signOut = useCallback(async () => {
    try {
      const tokens = await tokenStore.read();
      if (tokens) await repos.auth.logout(tokens.refreshToken);
    } catch {
      /* best-effort server logout; always clear locally below */
    } finally {
      await tokenStore.clear();
      await writeJson<Session | null>(SESSION_KEY, null);
      authSnapshot.clear();
      queryClient.clear();
      setSession(null);
      setStatus('unauthenticated');
    }
  }, [repos]);

  // Rotates tokens on a 401 (driven by httpClient via authBridge). Returns whether
  // a fresh access token is now in the snapshot.
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await tokenStore.read();
      if (!tokens) return false;
      const next = await repos.auth.refresh(tokens.refreshToken);
      await tokenStore.save(next);
      authSnapshot.set({ accessToken: next.accessToken, tenantId: authSnapshot.get().tenantId });
      setSession((prev) => (prev ? { ...prev, ...next } : prev));
      return true;
    } catch {
      return false;
    }
  }, [repos]);

  // Expose refresh/sign-out to the startup-time httpClient.
  useEffect(() => {
    authBridge.register({ refresh, signOut });
  }, [refresh, signOut]);

  const value = useMemo(
    () => ({
      status,
      session,
      pendingSchools,
      signIn,
      signOut,
      requestOtp,
      signInWithOtp,
      forgotPassword,
      resetPassword,
      changePassword,
      switchSchool,
      updatePhoto,
    }),
    [
      status,
      session,
      pendingSchools,
      signIn,
      signOut,
      requestOtp,
      signInWithOtp,
      forgotPassword,
      resetPassword,
      changePassword,
      updatePhoto,
      switchSchool,
    ]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Convenience for query keys: current tenant id (or 'anon'). */
export function useTenantId(): string {
  return useAuth().session?.tenant.id ?? 'anon';
}
