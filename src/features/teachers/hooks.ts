import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

/** Active teachers from GET /teachers (principal + teacher staff directory). */
export function useSchoolTeachers() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.teachers(tenantId),
    queryFn: () => repos.teachers.list(),
  });
}
