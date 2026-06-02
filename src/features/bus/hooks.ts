import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { BoardingRecord } from '@/data/domain';

export function useAssignedBus() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.bus(tenantId),
    queryFn: () => repos.bus.assignedBus(),
  });
}

export function useBusPosition(busId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.busPosition(tenantId, busId),
    queryFn: () => repos.bus.position(busId),
    enabled: busId !== '',
    refetchInterval: 3000,
  });
}

export function useBusRoster(busId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.busRoster(tenantId, busId),
    queryFn: () => repos.bus.roster(busId),
    enabled: busId !== '',
  });
}

export function useSaveBoarding(busId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.busRoster(tenantId, busId);

  return useMutation({
    mutationFn: (records: BoardingRecord[]) => repos.bus.saveBoarding(busId, records),
    onMutate: async (records) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BoardingRecord[]>(key);
      qc.setQueryData<BoardingRecord[]>(key, () => records);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
