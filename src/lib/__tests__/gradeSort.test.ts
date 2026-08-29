import { compareGrades, compareSections, sortByGrade, sortBySection } from '../gradeSort';

test('compareGrades orders preschool before primary grades', () => {
  expect(compareGrades('Nursery', 'I')).toBeLessThan(0);
  expect(compareGrades('LKG', 'UKG')).toBeLessThan(0);
  expect(compareGrades('UKG', 'I')).toBeLessThan(0);
});

test('compareGrades orders roman numerals I through XII', () => {
  const grades = ['XII', 'I', 'V', 'III', 'XI', 'II'];
  const sorted = sortByGrade(grades, (g) => g);
  expect(sorted).toEqual(['I', 'II', 'III', 'V', 'XI', 'XII']);
});

test('compareGrades orders bare numbers and Class N labels', () => {
  expect(compareGrades('1', '12')).toBeLessThan(0);
  expect(compareGrades('Class 5', 'Class 10')).toBeLessThan(0);
  expect(compareGrades('5', 'Class 6')).toBeLessThan(0);
});

test('compareGrades puts unknown labels after known grades', () => {
  expect(compareGrades('Homeroom', 'XII')).toBeGreaterThan(0);
  expect(compareGrades('Homeroom', 'C1')).toBeGreaterThan(0);
});

test('sortByGrade sorts a mixed grade list ascending', () => {
  const grades = ['10', 'Nursery', 'III', 'LKG', 'Class 2', 'UKG', 'I', 'XII'];
  const sorted = sortByGrade(grades, (g) => g);
  expect(sorted).toEqual(['Nursery', 'LKG', 'UKG', 'I', 'Class 2', 'III', '10', 'XII']);
});

test('compareSections orders letter sections A, B, C', () => {
  expect(compareSections('B', 'A')).toBeGreaterThan(0);
  expect(compareSections('Section A', 'Section B')).toBeLessThan(0);
});

test('compareSections orders numeric sections', () => {
  expect(compareSections('2', '10')).toBeLessThan(0);
  expect(compareSections('Section 2', 'Section 10')).toBeLessThan(0);
});

test('sortBySection sorts sections ascending', () => {
  const sections = [{ s: 'C' }, { s: 'A' }, { s: 'B' }];
  const sorted = sortBySection(sections, (x) => x.s);
  expect(sorted.map((x) => x.s)).toEqual(['A', 'B', 'C']);
});
