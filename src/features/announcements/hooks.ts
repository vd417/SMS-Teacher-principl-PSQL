import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NewAnnouncementInput } from '@/data/repositories/types';
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

export function useCreateAnnouncement() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewAnnouncementInput) => repos.announcements.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.announcements(tenantId) }),
  });
}
