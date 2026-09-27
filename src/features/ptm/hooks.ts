import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { NewPtmInput } from '@/data/repositories/types';

export function usePtmMeetings() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.ptm(tenantId),
    queryFn: () => repos.ptm.list(),
  });
}

export function useCreatePtm() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.ptm(tenantId);

  return useMutation({
    mutationFn: (input: NewPtmInput) => repos.ptm.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeletePtm() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.ptm(tenantId);

  return useMutation({
    mutationFn: (id: string) => repos.ptm.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
