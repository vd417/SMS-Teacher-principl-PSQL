import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';

export function useAssignBusTeacher() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ busId, teacherUserId }: { busId: string; teacherUserId: string }) =>
      repos.principal.assignBusTeacher(busId, teacherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transportFleet(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.transportBuses(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.bus(tenantId) });
    },
  });
}

export function useUnassignBusTeacher() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (busId: string) => repos.principal.unassignBusTeacher(busId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transportFleet(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.transportBuses(tenantId) });
      qc.invalidateQueries({ queryKey: queryKeys.bus(tenantId) });
    },
  });
}
