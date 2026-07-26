import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { AttendanceRecord } from '@/data/domain';

export function useAttendance(classId: string, date: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.attendance(tenantId, classId, date),
    queryFn: () => repos.attendance.forClass(classId, date),
    enabled: classId !== '' && date !== '',
  });
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
      // Cross-screen freshness: the principal's school-wide attendance summary
      // and the teacher's Home dashboard both aggregate these same records.
      qc.invalidateQueries({ queryKey: queryKeys.principalAttendance(tenantId, date) });
      qc.invalidateQueries({ queryKey: queryKeys.principalOverview(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard(tenantId) });
    },
  });
}
