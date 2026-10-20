import { dedupeChatContacts, findExistingThread, formatChatIdentity } from '../chatThread';
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
  designation: overrides.designation,
  lastAt: overrides.lastAt,
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

test('formatChatIdentity shows the student class, section, and name for a parent', () => {
  expect(
    formatChatIdentity({
      name: 'Rahul Sharma',
      role: 'Parent',
      designation: 'Mother',
      childName: 'John Doe',
      childClassLabel: 'Class 5, Section A',
    })
  ).toEqual({
    title: 'Rahul Sharma',
    subtitle: 'Class 5 · Section A · John Doe',
  });
});

test('formatChatIdentity splits a compact class-section label', () => {
  expect(
    formatChatIdentity({
      name: 'Rahul Sharma',
      role: 'school.parent',
      childName: 'John Doe',
      childClassLabel: '5 - A',
    })
  ).toEqual({
    title: 'Rahul Sharma',
    subtitle: 'Class 5 · Section A · John Doe',
  });
});

test('formatChatIdentity shows a staff designation once, not beside the role', () => {
  expect(
    formatChatIdentity({
      name: 'Neha Singh',
      role: 'Teacher',
      designation: 'Senior Teacher',
    })
  ).toEqual({
    title: 'Neha Singh',
    subtitle: 'Senior Teacher',
  });
  expect(formatChatIdentity({ name: 'Neha Singh', role: 'Senior Teacher · Teacher' })).toEqual({
    title: 'Neha Singh',
    subtitle: 'Senior Teacher',
  });
});

test('formatChatIdentity omits empty child details and does not repeat the parent name', () => {
  expect(formatChatIdentity({ name: 'Rahul Sharma', role: 'Parent' })).toEqual({
    title: 'Rahul Sharma',
    subtitle: 'Parent',
  });
});

test('dedupeChatContacts keeps one staff card and one parent card per student', () => {
  const rows = dedupeChatContacts([
    contact({
      id: 'old',
      name: 'Neha Singh',
      role: 'Teacher',
      lastMessage: 'Earlier',
      lastAt: '2026-10-20T08:00:00Z',
    }),
    contact({
      id: 'new',
      name: 'Neha Singh',
      role: 'Senior Teacher',
      designation: 'Senior Teacher',
      lastMessage: 'Latest',
      unread: 2,
      lastAt: '2026-10-20T09:00:00Z',
    }),
    contact({
      id: 'p1',
      name: 'Rahul Sharma',
      role: 'Parent',
      childId: 'stu-a',
      childName: 'Aarav',
      childClassLabel: '5 - A',
      lastAt: '2026-10-20T07:00:00Z',
    }),
    contact({
      id: 'p2',
      name: 'Rahul Sharma',
      role: 'Mother',
      childId: 'stu-a',
      childName: 'Aarav',
      lastMessage: 'Please call',
      lastAt: '2026-10-20T10:00:00Z',
    }),
    contact({
      id: 'p0',
      name: 'Rahul Sharma',
      role: 'Parent',
      lastMessage: 'orphan',
    }),
  ]);

  expect(rows.map((row) => row.id)).toEqual(['new', 'p2']);
  expect(rows[1].childClassLabel).toBe('5 - A');
  expect(rows[0].unread).toBe(2);
});
