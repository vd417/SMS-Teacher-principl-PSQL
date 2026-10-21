import { principalDirectoryLabel, withSignedInPrincipal } from '../staffDirectory';
import type { SchoolStaffMember } from '@/data/domain';

const member = (
  overrides: Partial<SchoolStaffMember> & Pick<SchoolStaffMember, 'id' | 'name'>
): SchoolStaffMember => ({
  id: overrides.id,
  name: overrides.name,
  initials: overrides.initials ?? 'NS',
  roleLabel: overrides.roleLabel ?? 'HOD',
  subtitle: overrides.subtitle ?? overrides.roleLabel ?? 'HOD',
  userId: overrides.userId,
});

test('principalDirectoryLabel keeps the job title beside Principal', () => {
  expect(principalDirectoryLabel('HOD')).toBe('HOD · Principal');
  expect(principalDirectoryLabel('Teacher')).toBe('Principal');
  expect(principalDirectoryLabel('Principal')).toBe('Principal');
});

test('withSignedInPrincipal keeps Neha on the list and labels her Principal', () => {
  const rows = withSignedInPrincipal(
    [
      member({ id: 't-neha', name: 'Neha Singh', roleLabel: 'HOD' }),
      member({ id: 't2', name: 'Asha Rao', roleLabel: 'Teacher' }),
    ],
    { id: 'user-neha', name: 'Neha', role: 'principal' },
    [{ name: 'Neha Singh', userId: 'user-neha' }]
  );
  expect(rows.map((row) => row.name)).toEqual(['Neha Singh', 'Asha Rao']);
  expect(rows[0].roleLabel).toBe('HOD · Principal');
  expect(rows[0].subtitle).toBe('HOD · Principal');
});

test('withSignedInPrincipal still hides a teacher from their own list', () => {
  const rows = withSignedInPrincipal(
    [member({ id: 't1', name: 'Asha Rao' })],
    { id: 'user-asha', name: 'Asha Rao', role: 'teacher' },
    []
  );
  expect(rows).toEqual([]);
});
