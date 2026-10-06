import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { Session } from '@/data/domain';
import type { OtpChallenge, SchoolChoice } from '@/data/repositories/types';
import { tokenStore } from '@/lib/tokenStore';
import { readJson, writeJson, removeItem } from '@/lib/asyncStore';
import { sessionForStorage } from '@/lib/sessionStorage';
import { authSnapshot } from '@/lib/authSnapshot';
import { authBridge } from '@/features/auth/authBridge';
import { queryClient } from '@/lib/queryClient';
import { classifyError, isConnectivityError } from '@/lib/errors';
import {
  startCachePersistence,
  clearCachePersistence,
  type CacheIdentity,
  type PersistenceHandle,
} from '@/lib/queryPersist';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { logoForTenant, withTenantLogo } from '@/lib/schoolBranding';

// User + tenant are persisted here; tokens live in SecureStore (tokenStore).
// Together they rehydrate a full Session across app restarts.
const SESSION_KEY = 'sd.session';

async function persistSession(s: Session): Promise<void> {
  try {
    await writeJson(SESSION_KEY, sessionForStorage(s));
    return;
  } catch {
    /* QuotaExceededError — often a legacy sd.session with embedded photo/logo data. */
  }
  try {
    await removeItem(SESSION_KEY);
    await writeJson(
      SESSION_KEY,
      sessionForStorage({ ...s, tenant: { ...s.tenant, logoUrl: null } })
    );
  } catch {
    /* In-memory session still works; user may need to sign in again after a full reload. */
  }
}

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
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const repos = useRepositories();
  const [status, setStatus] = useState<Status>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [pendingSchools, setPendingSchools] = useState<SchoolChoice[] | null>(null);
  // The live cache-persistence subscription + the identity it belongs to, so we
  // can stop persisting and purge the right cache on logout / school switch.
  const persistHandle = useRef<PersistenceHandle | null>(null);
  const identityRef = useRef<CacheIdentity | null>(null);

  // Start (or restart) persisting the query cache for this identity and hydrate
  // any previously persisted cache. Returns the restore promise.
  const beginPersistence = useCallback((identity: CacheIdentity): Promise<void> => {
    if (persistHandle.current) persistHandle.current.stop();
    identityRef.current = identity;
    const [restored, handle] = startCachePersistence(queryClient, identity);
    persistHandle.current = handle;
    return restored;
  }, []);

  const stopPersistence = useCallback(() => {
    if (persistHandle.current) {
      persistHandle.current.stop();
      persistHandle.current = null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.read();
      const stored = await readJson<Session | null>(SESSION_KEY, null);
      if (!tokens || !stored) {
        if (tokens) await tokenStore.clear();
        setStatus('unauthenticated');
        return;
      }

      // Render cached UI immediately from the stored session — never block the
      // first screen on the network. me() runs afterwards, in the background.
      const optimistic: Session = { ...stored, ...tokens };
      authSnapshot.set({ accessToken: optimistic.accessToken, tenantId: optimistic.tenant.id });
      setSession(optimistic);
      setStatus('authenticated');
      // Hydrate the persisted query cache for this identity so screens show data.
      await beginPersistence({
        tenantId: optimistic.tenant.id,
        userId: optimistic.user.id,
      });

      try {
        // me() confirms the stored token is still valid and refreshes user data.
        const { user, tenant } = await repos.auth.me();
        const rehydrated: Session = {
          ...optimistic,
          user,
          tenant: {
            id: tenant.id,
            name: tenant.name || stored.tenant?.name || '',
            tier: tenant.tier ?? stored.tenant?.tier ?? 'silver',
            planName: tenant.planName || stored.tenant?.planName || '',
            logoUrl: stored.tenant?.logoUrl ?? null,
          },
        };
        authSnapshot.set({ accessToken: rehydrated.accessToken, tenantId: rehydrated.tenant.id });
        setSession(rehydrated);
        void persistSession(rehydrated);
        void repos.auth
          .listMySchools()
          .then((schoolList) => {
            const liveLogo = logoForTenant(tenant.id, schoolList);
            if (!liveLogo) return;
            setSession((prev) =>
              prev ? { ...prev, tenant: { ...prev.tenant, logoUrl: liveLogo } } : prev
            );
          })
          .catch(() => {
            /* logo is optional */
          });
      } catch (e) {
        // A network / timeout / 5xx here means "can't reach the backend right
        // now", NOT "signed out": keep the cached session so the app stays usable
        // offline. Only a genuine auth rejection ends the session.
        if (classifyError(e) === 'auth') {
          await tokenStore.clear();
          await writeJson<Session | null>(SESSION_KEY, null);
          if (identityRef.current) await clearCachePersistence(identityRef.current);
          stopPersistence();
          identityRef.current = null;
          authSnapshot.clear();
          queryClient.clear();
          setSession(null);
          setStatus('unauthenticated');
        }
      }
    })();
  }, [repos, beginPersistence, stopPersistence]);

  const establishSession = useCallback(
    async (s: Session) => {
      await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
      await persistSession(s);
      authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
      beginPersistence({ tenantId: s.tenant.id, userId: s.user.id });
      setSession(s);
      setStatus('authenticated');
    },
    [beginPersistence]
  );

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
        // Keep tokens alive for switch-school (snapshot alone is lost on refresh).
        await tokenStore.save({ accessToken: s.accessToken, refreshToken: s.refreshToken });
        authSnapshot.set({ accessToken: s.accessToken, tenantId: s.tenant.id });
        setPendingSchools(schools);
        setStatus('selecting-school');
        return;
      }
      await establishSession(withTenantLogo(s, schools));
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
      let s = await repos.auth.switchSchool(tenantId);
      try {
        const schools = await repos.auth.listMySchools();
        s = withTenantLogo(s, schools);
      } catch {
        s = withTenantLogo(s, pendingSchools);
      }
      queryClient.clear();
      await establishSession(s);
      setPendingSchools(null);
    },
    [repos, establishSession, pendingSchools]
  );

  const updatePhoto = useCallback(
    async (photoUrl: string | null) => {
      await repos.auth.updatePhoto(photoUrl);
      setSession((prev) => (prev ? { ...prev, user: { ...prev.user, photoUrl } } : prev));
    },
    [repos]
  );

  const refreshProfile = useCallback(async () => {
    const { user, tenant } = await repos.auth.me();
    let logoUrl: string | null | undefined;
    try {
      const schools = await repos.auth.listMySchools();
      logoUrl = logoForTenant(tenant.id, schools);
    } catch {
      logoUrl = undefined;
    }
    setSession((prev) =>
      prev
        ? {
            ...prev,
            user,
            tenant: {
              id: tenant.id,
              name: tenant.name || prev.tenant.name,
              tier: tenant.tier ?? prev.tenant.tier,
              planName: tenant.planName || prev.tenant.planName,
              logoUrl: logoUrl ?? prev.tenant.logoUrl ?? null,
            },
          }
        : prev
    );
  }, [repos]);

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
      // Purge this identity's persisted cache so private data never lingers for
      // the next user on a shared device, then stop the persistence subscription.
      if (identityRef.current) await clearCachePersistence(identityRef.current);
      stopPersistence();
      identityRef.current = null;
      authSnapshot.clear();
      queryClient.clear();
      setSession(null);
      setStatus('unauthenticated');
    }
  }, [repos, stopPersistence]);

  // Rotates tokens on a 401 (driven by httpClient via authBridge).
  // Returns true when a fresh access token is in the snapshot, false on a genuine
  // rejection (→ httpClient signs the user out). A network/timeout/5xx while
  // refreshing is transient: THROW so the original request fails and cached data
  // stays, but the session is NOT ended.
  const refresh = useCallback(async (): Promise<boolean> => {
    const tokens = await tokenStore.read();
    if (!tokens) return false;
    try {
      const next = await repos.auth.refresh(tokens.refreshToken);
      await tokenStore.save(next);
      authSnapshot.set({ accessToken: next.accessToken, tenantId: authSnapshot.get().tenantId });
      setSession((prev) => (prev ? { ...prev, ...next } : prev));
      return true;
    } catch (e) {
      if (isConnectivityError(e)) throw e;
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
      refreshProfile,
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
      refreshProfile,
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
