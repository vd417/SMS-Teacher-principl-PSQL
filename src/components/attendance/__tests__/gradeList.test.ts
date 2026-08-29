import { COLLAPSED_GRADE_LIMIT, hiddenGradeCount, visibleGradeItems } from '../gradeList';

const grades = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

test('shows all grades when list is within the collapsed limit', () => {
  const short = grades.slice(0, COLLAPSED_GRADE_LIMIT);
  expect(visibleGradeItems(short, false, false)).toEqual(short);
  expect(hiddenGradeCount(short, false, false)).toBe(0);
});

test('collapses long grade lists until expanded', () => {
  expect(visibleGradeItems(grades, false, false)).toHaveLength(COLLAPSED_GRADE_LIMIT);
  expect(hiddenGradeCount(grades, false, false)).toBe(grades.length - COLLAPSED_GRADE_LIMIT);
  expect(visibleGradeItems(grades, true, false)).toEqual(grades);
  expect(hiddenGradeCount(grades, true, false)).toBe(0);
});

test('searching bypasses the collapsed limit', () => {
  expect(visibleGradeItems(grades, false, true)).toEqual(grades);
  expect(hiddenGradeCount(grades, false, true)).toBe(0);
});
