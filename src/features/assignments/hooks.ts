import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { useClasses } from '@/features/classes/hooks';
import { assignedClassIdSet, filterByClassScope } from '@/lib/classScope';
import { queryKeys } from '@/lib/queryClient';
import type { NewAssignmentInput } from '@/data/repositories/types';
import type { Assignment } from '@/data/domain';

export function useAssignments() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const classIds = useMemo(() => assignedClassIdSet(classes), [classes]);

  const query = useQuery({
    queryKey: queryKeys.assignments(tenantId),
    queryFn: () => repos.assignments.list(),
  });

  const data = useMemo(
    () => filterByClassScope(query.data ?? [], classIds, (a) => a.classId),
    [query.data, classIds]
  );

  return {
    ...query,
    data,
    isLoading: query.isLoading || classesLoading,
  };
}

export function useCreateAssignment() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.assignments(tenantId);

  return useMutation({
    mutationFn: (input: NewAssignmentInput) => repos.assignments.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Assignment[]>(key);
      const optimistic: Assignment = {
        id: `temp_${Date.now()}`,
        title: input.title,
        classId: input.classId,
        className: input.className ?? '',
        subject: input.subject ?? '',
        dueDate: input.dueDate,
        submissionsCount: 0,
        totalStudents: 0,
        status: 'active',
        description: input.description,
        imageUri: input.imageUri,
        period: input.period ?? null,
      };
      qc.setQueryData<Assignment[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateAssignment() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.assignments(tenantId);

  return useMutation({
    mutationFn: ({ id, ...input }: NewAssignmentInput & { id: string }) =>
      repos.assignments.update(id, input),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
