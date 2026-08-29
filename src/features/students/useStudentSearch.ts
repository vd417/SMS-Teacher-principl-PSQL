import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import { classLabel, classGroupKey } from '@/lib/classLabel';
import { filterStudentsBySearch } from '@/lib/studentSearch';
import type { Class, Student } from '@/data/domain';

export type StudentSearchMatch = Student & {
  contextLabel: string;
  gradeName: string;
  section: string;
};

/** Fetches rosters for many classes in parallel (react-query caches per class). */
export function useClassRosters(classIds: string[], enabled: boolean) {
  const repos = useRepositories();
  const tenantId = useTenantId();

  const results = useQueries({
    queries: classIds.map((id) => ({
      queryKey: queryKeys.studentsByClass(tenantId, id),
      queryFn: () => repos.students.listByClass(id, { limit: 200 }),
      enabled: enabled && id !== '',
    })),
  });

  const students = useMemo(() => {
    const all: Student[] = [];
    for (const result of results) {
      if (result.data?.items) all.push(...result.data.items);
    }
    return all;
  }, [results]);

  const isLoading = enabled && results.some((r) => r.isLoading);

  return { students, isLoading };
}

export function useStudentSearchAcrossClasses(classes: Class[], searchQuery: string) {
  const isSearching = searchQuery.trim().length > 0;
  const classIds = useMemo(() => classes.map((c) => c.id), [classes]);
  const { students, isLoading } = useClassRosters(classIds, isSearching);

  const classById = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c])), [classes]);

  const matches = useMemo<StudentSearchMatch[]>(() => {
    if (!isSearching) return [];
    return filterStudentsBySearch(students, searchQuery)
      .map((student) => {
        const cls = classById[student.classId];
        return {
          ...student,
          contextLabel: cls ? classLabel(cls.name, cls.section) : student.grade,
          gradeName: cls ? classGroupKey(cls) : student.grade,
          section: cls?.section ?? '',
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [isSearching, students, searchQuery, classById]);

  return { matches, isLoading, isSearching };
}
