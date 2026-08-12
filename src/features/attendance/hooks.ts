import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { AttendanceRecord } from '@/data/domain';
import { countPresent, type SectionAttendance } from './gradeSummary';

export function useAttendance(classId: string, date: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.attendance(tenantId, classId, date),
    queryFn: () => repos.attendance.forClass(classId, date),
    enabled: classId !== '' && date !== '',
  });
}

export function useAttendanceRollCall(classId: string, date: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: ['attendance-roll-call', tenantId, classId, date],
    queryFn: () => repos.attendance.rollCall(classId, date),
    enabled: classId !== '' && date !== '',
  });
}

export interface SectionAttendanceSummaries {
  /** Per-section {total, present}, keyed by classId. */
  bySection: Record<string, SectionAttendance>;
  isLoading: boolean;
}

/**
 * Fetches each section's roster + today's attendance in parallel and returns
 * a per-section {total, present} map keyed by classId. Screens combine these
 * with `aggregateSections` (see gradeSummary.ts) to get a grade-level summary.
 */
export function useSectionAttendanceSummaries(
  classIds: string[],
  date: string
): SectionAttendanceSummaries {
  const repos = useRepositories();
  const tenantId = useTenantId();

  const rosterResults = useQueries({
    queries: classIds.map((id) => ({
      queryKey: queryKeys.studentsByClass(tenantId, id),
      queryFn: () => repos.students.listByClass(id, { limit: 200 }),
      enabled: id !== '',
    })),
  });

  const attendanceResults = useQueries({
    queries: classIds.map((id) => ({
      queryKey: queryKeys.attendance(tenantId, id, date),
      queryFn: () => repos.attendance.forClass(id, date),
      enabled: id !== '' && date !== '',
    })),
  });

  const isLoading =
    rosterResults.some((r) => r.isLoading) || attendanceResults.some((r) => r.isLoading);

  const bySection: Record<string, SectionAttendance> = {};
  classIds.forEach((id, i) => {
    const rosterResult = rosterResults[i];
    const attendanceResult = attendanceResults[i];
    if (rosterResult?.isError || attendanceResult?.isError) {
      bySection[id] = { total: 0, present: 0 };
      return;
    }
    const roster = rosterResult?.data?.items ?? [];
    const records = attendanceResult?.data;
    bySection[id] = { total: roster.length, present: countPresent(records) };
  });

  return { bySection, isLoading };
}

export function useMarkAttendance(classId: string, date: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.attendance(tenantId, classId, date);

  return useMutation({
    mutationFn: (records: AttendanceRecord[]) => repos.attendance.save(classId, date, records),
    onMutate: async (records) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceRecord[]>(key);
      qc.setQueryData<AttendanceRecord[]>(key, () => records);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({
        queryKey: ['attendance-roll-call', tenantId, classId, date],
      });
      // Cross-screen freshness: the principal's school-wide attendance summary
      // and the teacher's Home dashboard both aggregate these same records.
      qc.invalidateQueries({ queryKey: queryKeys.principalAttendance(tenantId, date) });
      qc.invalidateQueries({ queryKey: queryKeys.principalOverview(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(tenantId) });
    },
  });
}
