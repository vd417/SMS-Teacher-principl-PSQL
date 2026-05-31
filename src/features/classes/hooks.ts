import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useClasses() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({ queryKey: queryKeys.classes(tenantId), queryFn: () => repos.classes.list() });
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
