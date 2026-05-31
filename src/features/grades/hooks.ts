import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { GradeInput } from '@/data/repositories/types';
import type { GradeEntry } from '@/data/domain';

export function useGradesByExam(examId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.gradesByExam(tenantId, examId),
    queryFn: () => repos.grades.listByExam(examId),
    enabled: examId !== '',
  });
}

export function useUpsertGrade(examId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.gradesByExam(tenantId, examId);

  return useMutation({
    mutationFn: (input: GradeInput) => repos.grades.upsert(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<GradeEntry[]>(key);
      qc.setQueryData<GradeEntry[]>(key, (old) => {
        const existing = (old ?? []).find(
          (g) => g.studentId === input.studentId && g.examId === input.examId
        );
        if (existing) {
          return (old ?? []).map((g) =>
            g.studentId === input.studentId && g.examId === input.examId
              ? { ...g, marks: input.marks }
              : g
          );
        }
        // Optimistic insert for new grade
        return [
          ...(old ?? []),
          {
            studentId: input.studentId,
            studentName: '',
            examId: input.examId,
            marks: input.marks,
            maxMarks: 0,
            grade: '',
          },
        ];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
