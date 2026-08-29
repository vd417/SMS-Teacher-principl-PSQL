import { filterStaffBySearch, matchesStaffSearch } from '../staffSearch';

const staff = {
  name: 'Jane Doe',
  subject: 'Mathematics',
  designation: 'Senior Teacher',
  role: undefined as string | undefined,
};

test('matches staff by name, subject, designation, or role', () => {
  expect(matchesStaffSearch(staff, 'jane')).toBe(true);
  expect(matchesStaffSearch(staff, 'math')).toBe(true);
  expect(matchesStaffSearch(staff, 'senior')).toBe(true);
  expect(matchesStaffSearch({ ...staff, role: 'Security' }, 'security')).toBe(true);
  expect(matchesStaffSearch(staff, 'peon')).toBe(false);
});

test('empty query matches all staff', () => {
  expect(matchesStaffSearch(staff, '')).toBe(true);
  expect(matchesStaffSearch(staff, '   ')).toBe(true);
});

test('filterStaffBySearch returns only matching members', () => {
  const list = [
    staff,
    { name: 'Bob', subject: 'English', designation: 'Teacher' },
    { name: 'Ravi', subject: '', role: 'Guard' },
  ];
  expect(filterStaffBySearch(list, 'guard')).toEqual([list[2]]);
  expect(filterStaffBySearch(list, '')).toEqual(list);
});
