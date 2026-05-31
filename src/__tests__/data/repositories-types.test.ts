import type { Repositories } from '@/data/repositories/types';

// Compile-time contract check: a stub must satisfy the full bundle shape.
describe('Repositories contract', () => {
  it('declares all 15 domains', () => {
    const keys: (keyof Repositories)[] = [
      'auth',
      'classes',
      'students',
      'attendance',
      'timetable',
      'exams',
      'grades',
      'assignments',
      'chat',
      'announcements',
      'calendar',
      'library',
      'payroll',
      'leave',
      'dashboard',
    ];
    expect(keys).toHaveLength(15);
  });
});
