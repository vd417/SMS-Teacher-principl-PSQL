import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { ApprovalListStatus } from '@/data/repositories/types';

export function useApprovals(status: ApprovalListStatus = 'pending') {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: [...queryKeys.approvals(tenantId), status],
    queryFn: () => repos.approvals.list(status),
  });
}

export interface DecideApprovalVars {
  id: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export function useDecideApproval() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: DecideApprovalVars) =>
      repos.approvals.decide(id, decision, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.approvals(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.principalOverview(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.leave(tenantId) });
    },
  });
}
