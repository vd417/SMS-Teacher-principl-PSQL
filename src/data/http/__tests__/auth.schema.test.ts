import {
  pickRole,
  resolveDisplayTitle,
  meSchema,
  schoolChoiceSchema,
  toSessionFromMe,
  toUserFromMe,
  toTenantFromMe,
  initialsFrom,
  maskIdentifier,
} from '../auth.schema';

test('pickRole prefers principal', () => {
  expect(pickRole(['teacher', 'principal'])).toBe('principal');
  expect(pickRole(['teacher'])).toBe('teacher');
  expect(pickRole([])).toBe('teacher');
});

test('resolveDisplayTitle shows Principal for principal role even with teacher title', () => {
  expect(resolveDisplayTitle('principal', 'Teacher')).toBe('Principal');
  expect(resolveDisplayTitle('principal', 'Senior Teacher')).toBe('Principal');
  expect(resolveDisplayTitle('principal', null)).toBe('Principal');
  expect(resolveDisplayTitle('teacher', 'Senior Teacher')).toBe('Senior Teacher');
  expect(resolveDisplayTitle('teacher', null)).toBe('');
});

test('toUserFromMe maps principal title via resolveDisplayTitle', () => {
  const me = meSchema.parse({
    id: 'u1',
    tenant_id: 't1',
    roles: ['school.principal', 'school.teacher'],
    name: 'Rina Pandey',
    title: 'Teacher',
  });
  const user = toUserFromMe(me);
  expect(user.role).toBe('principal');
  expect(user.title).toBe('Principal');
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
  expect(s.tenant).toEqual({
    id: 't1',
    name: 'Westbrook',
    tier: 'silver',
    planName: '',
  });
});

test('toTenantFromMe maps tier and plan_name (defaults tier to silver)', () => {
  const gold = toTenantFromMe(
    meSchema.parse({
      id: 'u1',
      tenant_id: 't1',
      roles: ['teacher'],
      tier: 'gold',
      plan_name: 'Gold',
    })
  );
  expect(gold).toEqual({ id: 't1', name: '', tier: 'gold', planName: 'Gold' });

  const missing = toTenantFromMe(meSchema.parse({ id: 'u1', tenant_id: 't1', roles: ['teacher'] }));
  expect(missing.tier).toBe('silver');
});

test('meSchema tolerates explicit nulls (the live backend sends null, not omitted, for unset profile fields)', () => {
  const me = meSchema.parse({
    id: 'u1',
    tenant_id: 't1',
    roles: ['teacher'],
    name: null,
    title: null,
    email: null,
    phone: null,
    classroom: null,
    tenant_name: null,
    must_set_password: null,
  });
  const s = toSessionFromMe({ accessToken: 'a', refreshToken: 'r' }, me);
  expect(s.user.name).toBe('');
  expect(s.user.title).toBe('');
  expect(s.tenant.name).toBe('');
  expect(s.user.mustSetPassword).toBe(false);
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

test('schoolChoiceSchema extracts id/name/logoUrl and strips the rest of a full ClientResponse row', () => {
  const fullClientResponseRow = {
    id: 't1',
    name: 'Westbrook Academy',
    slug: 'westbrook',
    country: 'IN',
    status: 'active',
    plan_id: 'p1',
    plan_name: 'Gold',
    tier: 'gold',
    mrr: 50000,
    students_count: 340,
    staff_count: 28,
    storage_gb: 4.2,
    limits: { students: 500, staff: 50 },
    created: '2024-01-01T00:00:00Z',
    health_score: 88,
    logo_url: 'https://cdn.example.com/westbrook-logo.png',
  };
  const school = schoolChoiceSchema.parse(fullClientResponseRow);
  expect(school).toEqual({
    id: 't1',
    name: 'Westbrook Academy',
    logoUrl: 'https://cdn.example.com/westbrook-logo.png',
  });
});

test('schoolChoiceSchema defaults logoUrl to null when the row has none', () => {
  const school = schoolChoiceSchema.parse({ id: 't2', name: 'No Logo School' });
  expect(school).toEqual({ id: 't2', name: 'No Logo School', logoUrl: null });
});

test('toUserFromMe maps photo_url (present, null, and absent)', () => {
  const withPhoto = toUserFromMe(
    meSchema.parse({
      id: 'u1',
      tenant_id: 't1',
      roles: ['teacher'],
      photo_url: 'https://cdn.example.com/a.png',
    })
  );
  expect(withPhoto.photoUrl).toBe('https://cdn.example.com/a.png');

  const explicitNull = toUserFromMe(
    meSchema.parse({ id: 'u2', tenant_id: 't1', roles: ['teacher'], photo_url: null })
  );
  expect(explicitNull.photoUrl).toBeNull();

  const absent = toUserFromMe(meSchema.parse({ id: 'u3', tenant_id: 't1', roles: ['teacher'] }));
  expect(absent.photoUrl).toBeNull();
});
