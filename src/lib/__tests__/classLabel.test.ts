import { classLabel } from '../classLabel';

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
