import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Session } from '@/data/domain';
import { tokenStore } from '@/lib/tokenStore';
import { useRepositories } from '@/data/repositories/RepositoryContext';

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
      if (!tokens) {
        setStatus('unauthenticated');
        return;
      }
      try {
        const user = await repos.auth.me();
        // me() confirms token validity; session was set by signIn
        setSession((s) => s ?? null);
        setStatus('authenticated');
        // user kept in session via signIn; me() confirms validity
        void user;
      } catch {
        await tokenStore.clear();
        setStatus('unauthenticated');
      }
    })();
  }, [repos]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await repos.auth.login(email, password);
      await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
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
