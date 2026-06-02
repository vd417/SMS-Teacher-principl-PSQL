import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { getCurrentPosition, buildCheckEvent } from '@/lib/geofence';
import type { CheckEventKind } from '@/data/domain';

export function useSchoolLocation() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.schoolLocation(tenantId),
    queryFn: () => repos.myAttendance.schoolLocation(),
    staleTime: 60 * 60 * 1000, // 1 hour — school location rarely changes
  });
}

export function useMyAttendanceToday() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.myAttendanceToday(tenantId),
    queryFn: () => repos.myAttendance.today(),
  });
}

export function useMyAttendanceHistory(limit = 30) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.myAttendanceHistory(tenantId, limit),
    queryFn: () => repos.myAttendance.history(limit),
  });
}

export function useMyAttendanceSummary(month: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.myAttendanceSummary(tenantId, month),
    queryFn: () => repos.myAttendance.summary(month),
    enabled: month !== '',
  });
}

/**
 * Records a check-in or check-out: reads the current GPS position, builds a
 * geofence-evaluated CheckEvent, and persists it. Location/permission failures
 * surface as the mutation's error.
 */
export function usePunch() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (kind: CheckEventKind) => {
      const [school, pos] = await Promise.all([
        repos.myAttendance.schoolLocation(),
        getCurrentPosition(),
      ]);
      const event = buildCheckEvent(kind, pos, school);
      return repos.myAttendance.punch(event);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceToday(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceHistoryPrefix(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.myAttendanceSummaryPrefix(tenantId) });
    },
  });
}
