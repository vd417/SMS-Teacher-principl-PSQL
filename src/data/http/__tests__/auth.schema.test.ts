import {
  pickRole,
  meSchema,
  toSessionFromMe,
  toUserFromMe,
  initialsFrom,
  maskIdentifier,
} from '../auth.schema';

test('pickRole prefers principal', () => {
  expect(pickRole(['teacher', 'principal'])).toBe('principal');
  expect(pickRole(['teacher'])).toBe('teacher');
  expect(pickRole([])).toBe('teacher');
});

test('pickRole accepts backend-canonical school.* roles', () => {
  expect(pickRole(['school.teacher'])).toBe('teacher');
  expect(pickRole(['school.principal'])).toBe('principal');
  expect(pickRole(['school.teacher', 'school.principal'])).toBe('principal');
  // mixed vocabularies still resolve
  expect(pickRole(['teacher', 'school.principal'])).toBe('principal');
});

test('initialsFrom derives initials', () => {
  expect(initialsFrom('Asha Rao')).toBe('AR');
  expect(initialsFrom('Asha')).toBe('AS');
  expect(initialsFrom('')).toBe('—');
});

test('toSessionFromMe builds a full Session', () => {
  const me = meSchema.parse({
    id: 'u1',
    tenant_id: 't1',
    roles: ['teacher'],
    name: 'Asha Rao',
    title: 'Teacher',
    email: 'a@b.c',
    phone: '1',
    employee: 'E1',
    classroom: '9A',
    joined: '2020',
    tenant_name: 'Westbrook',
  });
  const s = toSessionFromMe({ accessToken: 'a', refreshToken: 'r' }, me);
  expect(s.user.name).toBe('Asha Rao');
  expect(s.user.initials).toBe('AR');
  expect(s.user.role).toBe('teacher');
  expect(s.tenant).toEqual({ id: 't1', name: 'Westbrook' });
});

test('meSchema tolerates a minimal (un-extended) /me payload', () => {
  const me = meSchema.parse({ id: 'u1', tenant_id: 't1', roles: ['principal'] });
  const s = toSessionFromMe({ accessToken: 'a', refreshToken: 'r' }, me);
  expect(s.user.role).toBe('principal');
  expect(s.user.name).toBe('');
  expect(s.tenant.name).toBe('');
});

test('maskIdentifier masks email and phone', () => {
  expect(maskIdentifier('asha@x.com')).toContain('@x.com');
  expect(maskIdentifier('9876540118')).toMatch(/0118$/);
});

test('toUserFromMe maps must_set_password (defaults to false when absent)', () => {
  const withFlag = toUserFromMe(
    meSchema.parse({ id: 'u1', tenant_id: 't1', roles: ['teacher'], must_set_password: true })
  );
  expect(withFlag.mustSetPassword).toBe(true);

  const withoutFlag = toUserFromMe(
    meSchema.parse({ id: 'u2', tenant_id: 't1', roles: ['teacher'] })
  );
  expect(withoutFlag.mustSetPassword).toBe(false);
});
