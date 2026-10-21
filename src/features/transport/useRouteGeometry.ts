import { useQuery, useQueries, type UseQueryResult } from '@tanstack/react-query';
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
// exact construction (live authSnapshot + authBridge refresh) so a route lookup can
// retry with a fresh token. A failed lookup never signs the user out.
const http = createHttpClient({
  baseUrl: env.API_BASE_URL,
  getAuth: () => authSnapshot.get(),
  onRefresh: () => authBridge.refresh(),
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

/** Road geometry for every route currently on the fleet, one color and one bus icon each. */
export function useRouteGeometries(routeIds: string[]): RouteGeometryDTO[] {
  const tenantId = useTenantId();
  const unique = [...new Set(routeIds.map((id) => id.trim()).filter(Boolean))].sort();
  const results = useQueries({
    queries: unique.map((routeId) => ({
      queryKey: queryKeys.routeGeometry(tenantId, routeId),
      queryFn: () => routeGeometryRepo.get(routeId).catch(() => toUnavailable(routeId)),
      staleTime: 60_000,
    })),
  });
  return results.flatMap((result, index) => {
    if (result.data) return [result.data];
    if (result.isError) return [toUnavailable(unique[index])];
    return [];
  });
}
