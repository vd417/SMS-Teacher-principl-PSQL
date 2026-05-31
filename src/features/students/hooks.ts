import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useStudentsByClass(classId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.studentsByClass(tenantId, classId),
    queryFn: () => repos.students.listByClass(classId),
    enabled: classId !== '',
  });
}

export function useStudent(id: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.student(tenantId, id),
    queryFn: () => repos.students.get(id),
    enabled: id !== '',
  });
}
