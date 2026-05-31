import type { Class, Exam, Session, User, Tenant } from '@/data/domain';

describe('domain types', () => {
  it('Class has no presentation fields (compile-time + shape)', () => {
    const c: Class = {
      id: 'c1',
      name: 'Grade 9',
      section: 'A',
      subject: 'Math',
      studentCount: 32,
      room: 'R214',
    };
    expect(Object.keys(c)).not.toContain('color');
  });
  it('Session bundles tokens, user and tenant', () => {
    const user: User = {
      id: 'u1',
      name: 'Aanya',
      initials: 'AK',
      title: 'Teacher',
      email: 'a@test.com',
      phone: '000',
      employee: 'E1',
      classroom: 'C1',
      joined: '2020',
      role: 'teacher',
    };
    const tenant: Tenant = { id: 't1', name: 'Westbrook' };
    const s: Session = { accessToken: 'a', refreshToken: 'r', user, tenant };
    expect(s.tenant.id).toBe('t1');
  });
});
