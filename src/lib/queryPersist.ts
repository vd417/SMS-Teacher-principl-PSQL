import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// Persists the react-query cache to AsyncStorage so previously-synced data is
// available offline and across restarts. The cache is keyed by IDENTITY
// (tenant + user) so one user's/tenant's data can never hydrate into another's
// session on a shared device. Tokens are NOT stored here — they stay encrypted
// in SecureStore (tokenStore). Bump CACHE_VERSION to discard all persisted
// caches when the cached shape changes.
export const CACHE_VERSION = 'v1';

// Long enough to survive restarts; must be <= queryClient gcTime or entries are
// evicted before they can be persisted.
const MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days
const PREFIX = 'sd.rqcache';

export interface CacheIdentity {
  tenantId: string;
  userId: string;
}

export function cacheKeyFor(tenantId: string, userId: string): string {
  return `${PREFIX}:${tenantId}:${userId}`;
}

export interface PersistenceHandle {
  stop: () => void;
}

/**
 * Begin persisting `queryClient` under this identity and hydrate any previously
 * persisted cache for it. Returns the restore promise (resolves once the cached
 * data is loaded into the client) and a handle to stop persisting.
 */
export function startCachePersistence(
  queryClient: QueryClient,
  identity: CacheIdentity
): [Promise<void>, PersistenceHandle] {
  const persister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: cacheKeyFor(identity.tenantId, identity.userId),
    throttleTime: 1000,
  });
  const [stop, restored] = persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_AGE,
    buster: CACHE_VERSION,
    // Only persist queries that actually succeeded — never cache an error state.
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  });
  return [restored, { stop }];
}

/** Remove a stored identity's persisted cache (on logout / school switch). */
export async function clearCachePersistence(identity: CacheIdentity): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKeyFor(identity.tenantId, identity.userId));
  } catch {
    /* best-effort: the in-memory queryClient.clear() is the real guarantee */
  }
}
