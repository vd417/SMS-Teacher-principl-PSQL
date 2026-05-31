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
    const s: Session = {
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', name: 'Aanya', role: 'teacher' } as User,
      tenant: { id: 't1', name: 'Westbrook' } as Tenant,
    };
    expect(s.tenant.id).toBe('t1');
  });
});
