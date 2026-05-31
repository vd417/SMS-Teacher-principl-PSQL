import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { NewExamInput } from '@/data/repositories/types';
import type { Exam } from '@/data/domain';

export function useExams() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.exams(tenantId),
    queryFn: () => repos.exams.list(),
  });
}

export function useExam(id: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.exam(tenantId, id),
    queryFn: () => repos.exams.get(id),
    enabled: id !== '',
  });
}

export function useCreateExam() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.exams(tenantId);

  return useMutation({
    mutationFn: (input: NewExamInput) => repos.exams.create(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Exam[]>(key);
      const optimistic: Exam = {
        id: `temp_${Date.now()}`,
        title: input.title,
        classId: input.classId,
        className: '',
        subject: '',
        date: input.date,
        time: input.time,
        duration: input.duration,
        maxMarks: input.maxMarks,
        topics: input.topics,
        status: input.status,
      };
      qc.setQueryData<Exam[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateExam() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.exams(tenantId);

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<NewExamInput> }) =>
      repos.exams.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Exam[]>(key);
      qc.setQueryData<Exam[]>(key, (old) =>
        (old ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: queryKeys.exam(tenantId, id) });
    },
  });
}

export function useDeleteExam() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.exams(tenantId);

  return useMutation({
    mutationFn: (id: string) => repos.exams.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Exam[]>(key);
      qc.setQueryData<Exam[]>(key, (old) => (old ?? []).filter((e) => e.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
