import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { useClasses } from '@/features/classes/hooks';
import { placementFromClass, type PtmPlacement } from '@/lib/ptmGroups';
import { queryKeys } from '@/lib/queryClient';
import type { PtmMeeting } from '@/data/domain';
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

/** Class and section for each student, from the class roster. The PTM list
 * often omits them, so the meeting list looks them up here. */
export function usePtmClassLabels(studentIds: string[]): {
  placements: Record<string, PtmPlacement>;
  isLoading: boolean;
} {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const classesQuery = useClasses();
  const classes = classesQuery.data ?? [];
  const ids = [...new Set(studentIds.filter(Boolean))].sort();
  const classKey = classes
    .map((cls) => cls.id)
    .sort()
    .join('|');

  const labelsQuery = useQuery({
    queryKey: ['ptm-student-classes', tenantId, classKey, ids.join('|')],
    enabled: ids.length > 0 && classes.length > 0,
    queryFn: async () => {
      const wanted = new Set(ids);
      const placements: Record<string, PtmPlacement> = {};
      await Promise.all(
        classes.map(async (cls) => {
          const placement = placementFromClass(cls);
          let cursor: string | undefined;
          for (;;) {
            const page = await repos.students.listByClass(cls.id, { limit: 200, cursor });
            for (const student of page.items) {
              if (wanted.has(student.id)) placements[student.id] = placement;
            }
            if (!page.nextCursor) break;
            cursor = page.nextCursor;
          }
        })
      );
      return placements;
    },
  });

  const isLoading =
    classesQuery.isLoading || (ids.length > 0 && classes.length > 0 && labelsQuery.isLoading);

  return { placements: labelsQuery.data ?? {}, isLoading };
}

export function useDeletePtm() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.ptm(tenantId);

  return useMutation({
    mutationFn: (input: {
      ids: string[];
      reason: string;
      teacherIds?: string[];
      allTeachers?: boolean;
    }) =>
      Promise.all(
        input.ids.map((id) =>
          repos.ptm.remove(id, {
            reason: input.reason,
            notify: true,
            teacherIds: input.teacherIds,
            allTeachers: input.allTeachers,
          })
        )
      ),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<PtmMeeting[]>(key);
      const gone = new Set(input.ids);
      qc.setQueryData<PtmMeeting[]>(key, (current) =>
        (current ?? []).filter((meeting) => !gone.has(meeting.id))
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
