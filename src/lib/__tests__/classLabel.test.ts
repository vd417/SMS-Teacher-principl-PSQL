import { classLabel, gradeLabel, sectionLabel } from '../classLabel';

test('appends the section to the name', () => {
  expect(classLabel('IV', 'B')).toBe('IV-B');
});

test('uses a custom separator when given', () => {
  expect(classLabel('IV', 'B', ' – ')).toBe('IV – B');
});

test('does not duplicate the section when the name already ends with it', () => {
  expect(classLabel('IV-B', 'B')).toBe('IV-B');
});

test('returns the name unchanged when there is no section', () => {
  expect(classLabel('IV', '')).toBe('IV');
});

test('gradeLabel prefixes a bare numeric grade with "Class "', () => {
  expect(gradeLabel('1')).toBe('Class 1');
  expect(gradeLabel('12')).toBe('Class 12');
});

test('gradeLabel leaves a non-numeric grade name unchanged', () => {
  expect(gradeLabel('IV')).toBe('IV');
  expect(gradeLabel('Class 1')).toBe('Class 1');
});

test('sectionLabel prefixes a bare letter with "Section "', () => {
  expect(sectionLabel('A')).toBe('Section A');
});

test('sectionLabel leaves a section that already says "Section" or "Sec" unchanged', () => {
  expect(sectionLabel('Section A')).toBe('Section A');
  expect(sectionLabel('Sec A')).toBe('Sec A');
});
