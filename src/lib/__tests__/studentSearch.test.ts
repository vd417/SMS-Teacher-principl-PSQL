import { filterStudentsBySearch, matchesStudentSearch } from '../studentSearch';

const student = { name: 'Ankit Sharma', roll: '12' };

test('matches student by name or roll number', () => {
  expect(matchesStudentSearch(student, 'ankit')).toBe(true);
  expect(matchesStudentSearch(student, 'sharma')).toBe(true);
  expect(matchesStudentSearch(student, '12')).toBe(true);
  expect(matchesStudentSearch(student, 'bob')).toBe(false);
});

test('empty query matches all students', () => {
  expect(matchesStudentSearch(student, '')).toBe(true);
  expect(matchesStudentSearch(student, '   ')).toBe(true);
});

test('filterStudentsBySearch returns only matching students', () => {
  const list = [student, { name: 'Rina Pandey', roll: '3' }, { name: 'Amit Yadav', roll: '21' }];
  expect(filterStudentsBySearch(list, 'ankit')).toEqual([student]);
  expect(filterStudentsBySearch(list, '')).toEqual(list);
});
