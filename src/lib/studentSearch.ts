/** Fields used when matching students against a search query. */
export type StudentSearchFields = {
  name: string;
  roll?: string;
};

export function matchesStudentSearch(student: StudentSearchFields, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    student.name.toLowerCase().includes(q) || (student.roll?.toLowerCase().includes(q) ?? false)
  );
}

export function filterStudentsBySearch<T extends StudentSearchFields>(
  students: T[],
  query: string
): T[] {
  const q = query.trim();
  if (!q) return students;
  return students.filter((student) => matchesStudentSearch(student, q));
}
