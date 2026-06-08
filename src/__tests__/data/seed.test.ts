import { seed, principalSession } from '@/data/mock/seed';

describe('seed', () => {
  it('has the expected counts', () => {
    expect(seed.classes).toHaveLength(4);
    expect(seed.students).toHaveLength(20);
    expect(seed.exams).toHaveLength(5);
  });
  it('has the expected counts for every domain', () => {
    expect(seed.timetable).toHaveLength(13);
    expect(seed.assignments).toHaveLength(5);
    expect(seed.chatContacts).toHaveLength(6);
    expect(seed.announcements).toHaveLength(6);
    expect(seed.calendar).toHaveLength(8);
    expect(seed.library).toHaveLength(6);
    expect(seed.payslips).toHaveLength(6);
    expect(seed.leave).toHaveLength(4);
    expect(seed.grades).toHaveLength(9);
    expect(seed.attendance).toHaveLength(10);
  });
  it('strips presentation fields from every domain that carried them', () => {
    for (const c of seed.classes) {
      expect(c).not.toHaveProperty('color');
      expect(c.studentCount).toBeGreaterThan(0);
    }
    expect(seed.timetable[0]).not.toHaveProperty('color');
    expect(seed.exams[0]).not.toHaveProperty('color');
    expect(seed.assignments[0]).not.toHaveProperty('color');
    expect(seed.calendar[0]).not.toHaveProperty('color');
    expect(seed.library[0]).not.toHaveProperty('color');
    expect(seed.chatContacts[0]).not.toHaveProperty('avatarColor');
  });
  it('injects an id into every payslip', () => {
    for (const p of seed.payslips) expect(p.id).toBeTruthy();
  });
  it('session is a teacher in the Westbrook tenant', () => {
    expect(seed.session.user.role).toBe('teacher');
    expect(seed.session.tenant.id).toBe('school_westbrook');
    expect(seed.session.accessToken).toBeTruthy();
  });
});

describe('principal demo account', () => {
  it('principalSession is a principal with its own identity', () => {
    expect(principalSession.user.role).toBe('principal');
    expect(principalSession.user.email).toBe('sunita.r@westbrook.edu');
    expect(principalSession.tenant.id).toBe('school_westbrook');
  });
});

describe('approvals seed', () => {
  it('seeds pending leave and attendance_correction requests', () => {
    const pending = seed.approvals.filter((a) => a.status === 'pending');
    expect(pending.length).toBeGreaterThanOrEqual(3);
    expect(seed.approvals.some((a) => a.type === 'leave')).toBe(true);
    expect(seed.approvals.some((a) => a.type === 'attendance_correction')).toBe(true);
  });
});
