import { seed } from '@/data/mock/seed';

describe('seed', () => {
  it('has the expected counts', () => {
    expect(seed.classes).toHaveLength(4);
    expect(seed.students).toHaveLength(20);
    expect(seed.exams).toHaveLength(5);
  });
  it('classes carry no presentation fields', () => {
    expect(seed.classes[0]).not.toHaveProperty('color');
    expect(seed.classes[0].studentCount).toBeGreaterThan(0);
  });
  it('session is a teacher with a tenant', () => {
    expect(seed.session.user.role).toBe('teacher');
    expect(seed.session.tenant.id).toBeTruthy();
  });
});
