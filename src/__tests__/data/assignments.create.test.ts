import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from '@/data/mock/store';
import { mockAssignments } from '@/data/mock/assignments.repo';
import { assignmentSchema } from '@/validation/schemas';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('mockAssignments.create', () => {
  beforeEach(() => AsyncStorage.clear());

  it('derives class fields, prepends, and persists', async () => {
    const store = await createStore();
    const repo = mockAssignments(store);

    const created = await repo.create({
      title: 'Read chapter 4',
      classId: 'c1',
      dueDate: '2026-06-20',
      description: 'Answer questions 1-10',
      imageUri: 'data:image/png;base64,AAAA',
    });

    // class-derived fields come from c1 (Grade 9-A, Mathematics, 32 students)
    expect(created.className).toBe('Grade 9-A');
    expect(created.subject).toBe('Mathematics');
    expect(created.totalStudents).toBe(32);
    expect(created.submissionsCount).toBe(0);
    expect(created.status).toBe('active');
    expect(created.id.startsWith('asgn_')).toBe(true);
    expect(created.description).toBe('Answer questions 1-10');
    expect(created.imageUri).toBe('data:image/png;base64,AAAA');

    // prepended to the in-memory list
    const list = await repo.list();
    expect(list[0].id).toBe(created.id);

    // persisted across a fresh store
    const reopened = await createStore();
    expect(reopened.tables.assignments.find((a) => a.id === created.id)).toBeTruthy();
  });

  it('works without optional description/image', async () => {
    const store = await createStore();
    const repo = mockAssignments(store);
    const created = await repo.create({
      title: 'No image hw',
      classId: 'c2',
      dueDate: '2026-07-01',
    });
    expect(created.imageUri).toBeUndefined();
    expect(created.description).toBeUndefined();
    expect(created.className).toBe('Grade 10-B');
  });
});

describe('assignmentSchema', () => {
  it('accepts a valid payload (image optional)', () => {
    const r = assignmentSchema.safeParse({
      title: 'Read chapter 4',
      classId: 'c1',
      dueDate: '2026-06-20',
      description: 'optional',
    });
    expect(r.success).toBe(true);
  });

  it('rejects short title and missing class', () => {
    expect(
      assignmentSchema.safeParse({ title: 'ab', classId: 'c1', dueDate: '2026-06-20' }).success
    ).toBe(false);
    expect(
      assignmentSchema.safeParse({ title: 'Valid title', classId: '', dueDate: '2026-06-20' })
        .success
    ).toBe(false);
  });
});
