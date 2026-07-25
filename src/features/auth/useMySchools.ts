import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useAuth, useTenantId } from './AuthProvider';
import { queryKeys } from '@/lib/queryClient';

/** All schools the signed-in identity has a Users row in. Empty/single-item for
 * the common single-school case — callers should treat length <= 1 as "no picker
 * needed" rather than rendering a list of one. */
export function useMySchools() {
  const repos = useRepositories();
  const { status } = useAuth();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.mySchools(tenantId),
    queryFn: () => repos.auth.listMySchools(),
    enabled: status === 'authenticated',
    // School memberships change rarely; avoid a refetch on every Profile mount
    // for what is, for most users, a brand-new network call this screen never
    // made before.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}
