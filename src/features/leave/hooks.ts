import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { LeaveRequest } from '@/data/domain';
import type { NewLeaveInput } from '@/data/repositories/types';

export function useLeave() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.leave(tenantId),
    queryFn: () => repos.leave.list(),
  });
}

export function useApplyLeave() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.leave(tenantId);

  return useMutation({
    mutationFn: (input: NewLeaveInput) => repos.leave.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<LeaveRequest[]>(key);
      const optimistic: LeaveRequest = {
        id: `temp_${Date.now()}`,
        status: 'pending',
        appliedOn: new Date().toISOString().slice(0, 10),
        ...input,
      };
      qc.setQueryData<LeaveRequest[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
