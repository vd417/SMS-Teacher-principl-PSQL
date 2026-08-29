import { buildClassHubGrades } from '../useClassHubSelection';
import type { Class } from '@/data/domain';

const mk = (id: string, grade: string, section: string, name?: string): Class => ({
  id,
  name: name ?? `${grade}-${section}`,
  grade,
  section,
  subject: 'Math',
  studentCount: 30,
  room: '101',
});

test('buildClassHubGrades groups by grade and sorts Nursery → XII', () => {
  const classes = [
    mk('x', 'X', 'A'),
    mk('n', 'Nursery', 'A'),
    mk('iv-b', 'IV', 'B'),
    mk('iv-a', 'IV', 'A'),
    mk('xii', 'XII', 'A'),
  ];
  const grades = buildClassHubGrades(classes);
  expect(grades.map((g) => g.key)).toEqual(['Nursery', 'IV', 'X', 'XII']);
  expect(grades[1].sections.map((s) => s.section)).toEqual(['A', 'B']);
});

test('buildClassHubGrades sorts numeric grades as Class N order', () => {
  const classes = [mk('12', '12', 'A'), mk('1', '1', 'A'), mk('5', '5', 'A')];
  const grades = buildClassHubGrades(classes);
  expect(grades.map((g) => g.key)).toEqual(['1', '5', '12']);
});
