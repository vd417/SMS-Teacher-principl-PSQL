import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import { tokenStore } from '@/lib/tokenStore';
import { readJson, writeJson } from '@/lib/asyncStore';
import { authSnapshot } from '@/lib/authSnapshot';
import { queryClient } from '@/lib/queryClient';
import { useRepositories } from '@/data/repositories/RepositoryContext';

// User + tenant are persisted here; tokens live in SecureStore (tokenStore).
// Together they rehydrate a full Session across app restarts.
const SESSION_KEY = 'sd.session';

type Status = 'loading' | 'authenticated' | 'unauthenticated';
interface AuthValue {
  status: Status;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);

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

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await repos.auth.login(email, password);
      await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      await writeJson<Session>(SESSION_KEY, s);
      authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
      setSession(s);
      setStatus('authenticated');
    },
    [repos]
  );

  const signOut = useCallback(async () => {
    try {
      await repos.auth.logout();
    } finally {
      await tokenStore.clear();
      await writeJson<Session | null>(SESSION_KEY, null);
      authSnapshot.clear();
      queryClient.clear();
      setSession(null);
      setStatus('unauthenticated');
    }
  }, [repos]);

  const value = useMemo(
    () => ({ status, session, signIn, signOut }),
    [status, session, signIn, signOut]
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
