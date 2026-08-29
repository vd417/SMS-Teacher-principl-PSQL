import { assignedClassIdSet, filterByClassScope } from '../classScope';
import type { Class } from '@/data/domain';

const cls = (id: string): Class => ({
  id,
  name: 'IX',
  grade: 'IX',
  section: 'A',
  subject: 'Math',
  studentCount: 30,
  room: '101',
});

test('filterByClassScope keeps only assigned class items', () => {
  const ids = assignedClassIdSet([cls('c1')]);
  const items = [
    { id: 'e1', classId: 'c1' },
    { id: 'e2', classId: 'c2' },
  ];
  expect(filterByClassScope(items, ids, (x) => x.classId)).toEqual([{ id: 'e1', classId: 'c1' }]);
});

test('filterByClassScope returns empty when no classes assigned', () => {
  expect(filterByClassScope([{ classId: 'c1' }], new Set(), (x) => x.classId)).toEqual([]);
});
