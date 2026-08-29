import { mergeSchoolStaffDirectory } from '../mergeSchoolStaffDirectory';
import type { SchoolStaffMember } from '@/data/domain';

const teacher = (name: string, roleLabel = 'Teacher'): SchoolStaffMember => ({
  id: `t-${name}`,
  name,
  initials: name.slice(0, 2),
  roleLabel,
  subtitle: roleLabel,
  phone: '9000000001',
});

const staff = (name: string, roleLabel: string): SchoolStaffMember => ({
  id: `s-${name}`,
  name,
  initials: name.slice(0, 2),
  roleLabel,
  subtitle: roleLabel,
  phone: '9000000002',
});

test('mergeSchoolStaffDirectory includes principal staff and teachers without duplicates', () => {
  const merged = mergeSchoolStaffDirectory(
    [teacher('Amit'), teacher('Rina')],
    [staff('Priya Principal', 'Principal'), staff('Guard One', 'Security')]
  );

  expect(merged.map((m) => m.name)).toEqual(['Priya Principal', 'Amit', 'Guard One', 'Rina']);
});

test('mergeSchoolStaffDirectory prefers teacher row when names match', () => {
  const merged = mergeSchoolStaffDirectory(
    [{ ...teacher('Rina'), phone: '111' }],
    [{ ...staff('Rina', 'Teacher'), phone: '222' }]
  );

  expect(merged).toHaveLength(1);
  expect(merged[0].phone).toBe('111');
});
