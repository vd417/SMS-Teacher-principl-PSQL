import { filterGradesBySearch, matchesGradeSearch } from '../gradeSearch';

test('matches grade name or section labels', () => {
  expect(matchesGradeSearch('IV', ['A', 'B'], 'iv')).toBe(true);
  expect(matchesGradeSearch('IV', ['A', 'B'], 'section b')).toBe(true);
  expect(matchesGradeSearch('V', ['A'], 'iv')).toBe(false);
});

test('filterGradesBySearch uses accessors', () => {
  const grades = [
    { name: 'IV', sections: ['A'] },
    { name: 'V', sections: ['B'] },
  ];
  expect(
    filterGradesBySearch(
      grades,
      'section b',
      (g) => g.name,
      (g) => g.sections
    )
  ).toEqual([grades[1]]);
});
