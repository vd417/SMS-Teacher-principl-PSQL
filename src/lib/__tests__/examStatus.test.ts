import { mapExamPaperStatus } from '../examStatus';

test('mapExamPaperStatus maps CRM statuses to app vocabulary', () => {
  expect(mapExamPaperStatus('scheduled')).toBe('upcoming');
  expect(mapExamPaperStatus('marks_entry')).toBe('upcoming');
  expect(mapExamPaperStatus('completed')).toBe('completed');
  expect(mapExamPaperStatus('draft')).toBe('draft');
  expect(mapExamPaperStatus('upcoming')).toBe('upcoming');
});
