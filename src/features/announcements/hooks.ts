import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useAnnouncements() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.announcements(tenantId),
    queryFn: () => repos.announcements.list(),
  });
}
