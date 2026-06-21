import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

// Flat list of the class roster (first page, up to 200) — used where the whole
// class is needed at once (e.g. attendance roll-call).
export function useStudentsByClass(classId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.studentsByClass(tenantId, classId),
    queryFn: () => repos.students.listByClass(classId, { limit: 200 }),
    enabled: classId !== '',
    select: (p) => p.items,
  });
}

// Cursor-paginated roster for infinite scroll (ClassDetailScreen).
export function useStudentsByClassPaged(classId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useInfiniteQuery({
    queryKey: [...queryKeys.studentsByClass(tenantId, classId), 'paged'],
    queryFn: ({ pageParam }) =>
      repos.students.listByClass(classId, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
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
