import { homeroomPlaces, teacherListMeta } from '../teacherListLabel';

test('homeroomPlaces uses the class row and the teacher record', () => {
  expect(
    homeroomPlaces('t1', 'VI-A', [{ classTeacherId: 't1', name: 'I-A', grade: 'I', section: 'A' }])
  ).toEqual(['I · Section A', 'VI · Section A']);
});

test('homeroomPlaces does not repeat the same class from both sources', () => {
  expect(
    homeroomPlaces('t1', 'I-A', [{ classTeacherId: 't1', name: 'I-A', grade: 'I', section: 'A' }])
  ).toEqual(['I · Section A']);
});

test('teacherListMeta puts the class beside the designation', () => {
  expect(teacherListMeta('HOD', ['I · Section A'])).toBe('HOD · Class teacher · I · Section A');
  expect(teacherListMeta('Class Teacher', ['V · Section B'])).toBe('Class Teacher · V · Section B');
  expect(teacherListMeta('Senior Teacher', [])).toBe('Senior Teacher');
});
