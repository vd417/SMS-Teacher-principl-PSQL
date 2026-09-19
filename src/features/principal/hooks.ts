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

export function usePrincipalAttendance(date?: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  // Explicit local date: the backend defaults to UTC-today when omitted, which
  // silently falls on the wrong calendar day for any tenant west of UTC+0 for
  // part of its day (e.g. IST) — see queryKeys.attendance's own local-date use.
  const resolvedDate = date ?? todayISO();
  return useQuery({
    queryKey: queryKeys.principalAttendance(tenantId, resolvedDate),
    queryFn: () => repos.principal.attendance(resolvedDate),
  });
}

export function useStaffAttendanceHistory(personId: string, limit = 30) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.staffAttendanceHistory(tenantId, personId),
    queryFn: () => repos.principal.staffAttendanceHistory(personId, limit),
    enabled: !!personId,
  });
}

export function useTransportFleet() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.transportFleet(tenantId),
    queryFn: () => repos.principal.transportFleet(),
    // TransportFleetHub push keeps rows fresh; this is just a fallback if the socket drops.
    refetchInterval: 30000,
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
