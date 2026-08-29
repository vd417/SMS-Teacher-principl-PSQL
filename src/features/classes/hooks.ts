import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useAuth, useTenantId } from '@/features/auth/AuthProvider';
import { classesForRole } from '@/lib/assignedClasses';
import { queryKeys } from '@/lib/queryClient';

export function useClasses() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { session } = useAuth();
  const role = session?.user.role ?? 'teacher';
  const homeroomLabel = session?.user.classroom;

  const classesQuery = useQuery({
    queryKey: queryKeys.classes(tenantId),
    queryFn: () => repos.classes.list(),
  });

  const timetableQuery = useQuery({
    queryKey: queryKeys.timetable(tenantId),
    queryFn: () => repos.timetable.list(),
    enabled: role === 'teacher',
  });

  const data = useMemo(
    () =>
      classesForRole(classesQuery.data ?? [], role, {
        timetable: timetableQuery.data,
        homeroomLabel,
      }),
    [classesQuery.data, timetableQuery.data, role, homeroomLabel]
  );

  const isLoading = classesQuery.isLoading || (role === 'teacher' && timetableQuery.isLoading);
  const isError = classesQuery.isError || timetableQuery.isError;

  return {
    ...classesQuery,
    data,
    isLoading,
    isError,
    refetch: async () => {
      const results = await Promise.all([
        classesQuery.refetch(),
        role === 'teacher' ? timetableQuery.refetch() : Promise.resolve(),
      ]);
      return results[0];
    },
  };
}

export function useClass(id: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.class(tenantId, id),
    queryFn: () => repos.classes.get(id),
    enabled: id !== '',
  });
}
