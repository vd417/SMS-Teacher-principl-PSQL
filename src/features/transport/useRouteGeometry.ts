import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { createHttpClient } from '@/lib/httpClient';
import { env } from '@/config/env';
import { authSnapshot } from '@/lib/authSnapshot';
import { authBridge } from '@/features/auth/authBridge';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { httpRouteGeometry, type RouteGeometryDTO } from '@/data/http/routeGeometry.repo';

// Route geometry isn't part of BusRepository/Repositories (it's a standalone,
// road-following-geometry lookup, not teacher-scoped bus data), so this hook builds its
// own HttpClient rather than going through useRepositories() — mirroring AppProviders.tsx's
// exact construction (live authSnapshot + authBridge refresh/sign-out) so it gets the same
// auth-retry behavior as every other authenticated call.
const http = createHttpClient({
  baseUrl: env.API_BASE_URL,
  getAuth: () => authSnapshot.get(),
  onRefresh: () => authBridge.refresh(),
  onAuthLost: () => {
    void authBridge.signOut();
  },
});

const routeGeometryRepo = httpRouteGeometry(http);

// Query errors (e.g. a non-2xx from a wrong/unmapped id) leave TanStack Query's `data` as
// `undefined` — the same value it has while genuinely still loading. Callers (FleetMap /
// FleetMap.web) gate both the road polyline (`status === 'available'`) and the "Route
// unavailable" badge (`status === 'unavailable'`) on `data?.status`, so an error must be
// surfaced as an explicit unavailable-shaped DTO, not silently collapsed into "still loading".
function toUnavailable(routeId: string): RouteGeometryDTO {
  return {
    routeId,
    status: 'unavailable',
    format: null,
    geometry: null,
    distanceMeters: null,
    durationSeconds: null,
    stopSequenceHash: '',
    generatedAt: null,
  };
}

export function useRouteGeometry(
  routeId: string | null | undefined
): UseQueryResult<RouteGeometryDTO> {
  const tenantId = useTenantId();
  const query = useQuery({
    queryKey: queryKeys.routeGeometry(tenantId, routeId ?? ''),
    queryFn: () => routeGeometryRepo.get(routeId as string),
    enabled: !!routeId,
    staleTime: 60_000,
  });

  const effectiveData =
    query.data ?? (query.isError && routeId ? toUnavailable(routeId) : query.data);

  return { ...query, data: effectiveData } as UseQueryResult<RouteGeometryDTO>;
}
