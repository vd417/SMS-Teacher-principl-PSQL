import { findExistingThread, formatChatIdentity } from '../chatThread';
import type { ChatContact } from '@/data/domain';

const contact = (
  overrides: Partial<ChatContact> & Pick<ChatContact, 'id' | 'name'>
): ChatContact => ({
  id: overrides.id,
  name: overrides.name,
  role: overrides.role ?? 'Parent',
  initials: overrides.initials ?? 'XX',
  lastMessage: overrides.lastMessage ?? '',
  time: overrides.time ?? '',
  unread: overrides.unread ?? 0,
  online: overrides.online ?? false,
  lastMessageMine: overrides.lastMessageMine ?? false,
  childId: overrides.childId,
  childName: overrides.childName,
  childClassLabel: overrides.childClassLabel,
});

test('findExistingThread prefers childId over a matching parent name', () => {
  const threads = [
    contact({
      id: 't1',
      name: 'Rahul Sharma',
      role: 'Parent',
      childId: 'stu-a',
      childName: 'John',
    }),
    contact({
      id: 't2',
      name: 'Rahul Sharma',
      role: 'Parent',
      childId: 'stu-b',
      childName: 'Jane',
    }),
  ];
  expect(
    findExistingThread(threads, { name: 'Rahul Sharma', role: 'Parent', childId: 'stu-b' })?.id
  ).toBe('t2');
});

test('findExistingThread does not reuse a same-name parent thread for a different child', () => {
  const threads = [contact({ id: 't1', name: 'Rahul Sharma', role: 'Parent', childId: 'stu-a' })];
  expect(
    findExistingThread(threads, { name: 'Rahul Sharma', role: 'Parent', childId: 'stu-b' })
  ).toBeUndefined();
});

test('findExistingThread matches staff threads by name and role when there is no child', () => {
  const threads = [
    contact({ id: 's1', name: 'Priya Nair', role: 'Teacher' }),
    contact({ id: 'p1', name: 'Priya Nair', role: 'Parent', childId: 'stu-a' }),
  ];
  expect(findExistingThread(threads, { name: 'Priya Nair', role: 'Teacher' })?.id).toBe('s1');
});

test('formatChatIdentity shows parent of student with class and section', () => {
  expect(
    formatChatIdentity({
      name: 'Rahul Sharma',
      role: 'Parent',
      childName: 'John Doe',
      childClassLabel: 'Class 5, Section A',
    })
  ).toEqual({
    title: 'Rahul Sharma',
    subtitle: 'Parent of John Doe (Class 5, Section A)',
  });
});

test('formatChatIdentity omits empty child details and does not repeat the parent name', () => {
  expect(formatChatIdentity({ name: 'Rahul Sharma', role: 'Parent' })).toEqual({
    title: 'Rahul Sharma',
    subtitle: 'Parent',
  });
});
