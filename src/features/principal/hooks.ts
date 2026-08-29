import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { todayISO } from '@/lib/date';

export function usePrincipalOverview() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.principalOverview(tenantId),
    queryFn: () => repos.principal.overview(),
  });
}

export function usePrincipalAttendance() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  // Explicit local date: the backend defaults to UTC-today when omitted, which
  // silently falls on the wrong calendar day for any tenant west of UTC+0 for
  // part of its day (e.g. IST) — see queryKeys.attendance's own local-date use.
  const date = todayISO();
  return useQuery({
    queryKey: queryKeys.principalAttendance(tenantId, date),
    queryFn: () => repos.principal.attendance(date),
  });
}

export function useTransportFleet() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.transportFleet(tenantId),
    queryFn: () => repos.principal.transportFleet(),
    refetchInterval: 5000,
  });
}

export function useTransportBuses() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.transportBuses(tenantId),
    queryFn: () => repos.principal.listTransportBuses(),
  });
}
