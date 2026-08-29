import { gradeLabel, sectionLabel } from './classLabel';

export function matchesGradeSearch(gradeName: string, sections: string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const gradeMatch =
    gradeName.toLowerCase().includes(q) || gradeLabel(gradeName).toLowerCase().includes(q);
  const sectionMatch = sections.some(
    (section) =>
      section.toLowerCase().includes(q) || sectionLabel(section).toLowerCase().includes(q)
  );
  return gradeMatch || sectionMatch;
}

export function filterGradesBySearch<T>(
  grades: T[],
  query: string,
  getName: (grade: T) => string,
  getSections: (grade: T) => string[]
): T[] {
  const q = query.trim();
  if (!q) return grades;
  return grades.filter((grade) => matchesGradeSearch(getName(grade), getSections(grade), q));
}
