import { useMemo, useState, useEffect, useCallback } from 'react';
import type { Class } from '@/data/domain';
import { classGroupKey, gradeLabel } from '@/lib/classLabel';
import { sortByGrade, sortBySection } from '@/lib/gradeSort';

export interface ClassHubGrade {
  key: string;
  label: string;
  sections: Class[];
}

export function buildClassHubGrades(classes: Class[]): ClassHubGrade[] {
  const map = new Map<string, Class[]>();
  for (const c of classes) {
    const key = classGroupKey(c);
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return sortByGrade(
    [...map.entries()].map(([key, sections]) => ({
      key,
      label: gradeLabel(key),
      sections: sortBySection(sections, (s) => s.section),
    })),
    (g) => g.key
  );
}

export function useClassHubSelection(classes: Class[]) {
  const grades = useMemo(() => buildClassHubGrades(classes), [classes]);
  const [gradeKey, setGradeKey] = useState('');
  const [sectionId, setSectionId] = useState('');

  useEffect(() => {
    if (!grades.length) {
      setGradeKey('');
      setSectionId('');
      return;
    }
    const grade = grades.find((g) => g.key === gradeKey) ?? grades[0];
    if (grade.key !== gradeKey) setGradeKey(grade.key);
    const section = grade.sections.find((s) => s.id === sectionId) ?? grade.sections[0];
    if (section && section.id !== sectionId) setSectionId(section.id);
  }, [grades, gradeKey, sectionId]);

  const selectGrade = useCallback(
    (key: string) => {
      setGradeKey(key);
      const grade = grades.find((g) => g.key === key);
      if (grade?.sections[0]) setSectionId(grade.sections[0].id);
    },
    [grades]
  );

  const currentGrade = grades.find((g) => g.key === gradeKey) ?? grades[0];
  const selectedClass =
    currentGrade?.sections.find((s) => s.id === sectionId) ?? currentGrade?.sections[0];

  return {
    grades,
    gradeKey: currentGrade?.key ?? '',
    sectionId: selectedClass?.id ?? '',
    selectGrade,
    setSectionId,
    selectedClass,
    currentGrade,
  };
}
