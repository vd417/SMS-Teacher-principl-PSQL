import {
  dedupeChatContacts,
  findExistingThread,
  formatChatIdentity,
  selfDisplayNames,
  withParentClassSections,
  withProfilePhotos,
  withStaffRoles,
  withoutSelfChat,
} from '../chatThread';
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
  photoUrl: overrides.photoUrl,
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

test('findExistingThread reuses the parent thread when chat starts from the class list', () => {
  const threads = [
    contact({
      id: 'parent-thread',
      name: 'Rahul Sharma',
      role: 'Parent',
      childId: 'stu-a',
      childName: 'Aarav',
    }),
  ];
  expect(
    findExistingThread(threads, { name: 'Aarav', role: 'Student', childId: 'stu-a' })?.id
  ).toBe('parent-thread');
  expect(
    findExistingThread(threads, { name: 'Rahul Sharma', role: 'Mother', childId: 'stu-a' })?.id
  ).toBe('parent-thread');
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
    subtitle: 'Parent\nJohn Doe · Class 5 · Section A',
  });
});

test('formatChatIdentity shows a student role with class and section', () => {
  expect(
    formatChatIdentity({
      name: 'Aarav Sharma',
      role: 'Student',
      childClassLabel: 'I - A',
    })
  ).toEqual({
    title: 'Aarav Sharma',
    subtitle: 'Student · I · Section A',
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
    subtitle: 'Parent\nJohn Doe · Class 5 · Section A',
  });
});

test('formatChatIdentity shows a staff designation and the role', () => {
  expect(
    formatChatIdentity({
      name: 'Neha Singh',
      role: 'Teacher',
      designation: 'Senior Teacher',
    })
  ).toEqual({
    title: 'Neha Singh',
    subtitle: 'Senior Teacher · Teacher',
  });
  expect(formatChatIdentity({ name: 'Neha Singh', role: 'Senior Teacher · Teacher' })).toEqual({
    title: 'Neha Singh',
    subtitle: 'Senior Teacher · Teacher',
  });
  expect(formatChatIdentity({ name: 'Neha Singh', role: 'HOD' })).toEqual({
    title: 'Neha Singh',
    subtitle: 'HOD · Teacher',
  });
});

test('formatChatIdentity keeps a principal chat labeled with role and designation', () => {
  expect(
    formatChatIdentity({
      name: 'Priya Nair',
      role: 'school.principal',
      designation: 'Head of School',
      childName: 'Aarav',
      childClassLabel: '5 - A',
    })
  ).toEqual({
    title: 'Priya Nair',
    subtitle: 'Head of School · Principal',
  });
});

test('formatChatIdentity omits empty child details and does not repeat the parent name', () => {
  expect(formatChatIdentity({ name: 'Rahul Sharma', role: 'Parent' })).toEqual({
    title: 'Rahul Sharma',
    subtitle: 'Parent',
  });
});

test('withoutSelfChat hides the signed-in person from their own inbox', () => {
  const rows = withoutSelfChat(
    [
      contact({ id: 'self', name: 'Neha Singh', role: 'HOD' }),
      contact({ id: 'p1', name: 'Ramesh Sharma', role: 'Parent' }),
    ],
    'neha singh'
  );
  expect(rows.map((row) => row.id)).toEqual(['p1']);
});

test('withoutSelfChat hides the principal when the login name is blank but the teacher row matches', () => {
  const names = selfDisplayNames({ id: 'user-neha', name: '', email: 'neha@school.test' }, [
    { name: 'Neha Singh', userId: 'user-neha', email: 'neha@school.test' },
    { name: 'Asha Rao', userId: 'user-asha', email: 'asha@school.test' },
  ]);
  const rows = withoutSelfChat(
    [
      contact({ id: 'self', name: 'Mrs. Neha Singh', role: 'Principal' }),
      contact({ id: 'p1', name: 'Ramesh Sharma', role: 'Parent' }),
      contact({ id: 't1', name: 'Asha Rao', role: 'Teacher' }),
    ],
    names
  );
  expect(names).toEqual(['Neha Singh']);
  expect(rows.map((row) => row.id)).toEqual(['p1', 't1']);
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
    contact({
      id: 'stu',
      name: 'Aarav',
      role: 'Student',
      childId: 'stu-a',
      lastMessage: 'duplicate from class list',
    }),
  ]);

  expect(rows.map((row) => row.id)).toEqual(['new', 'p2']);
  expect(rows[1].childClassLabel).toBe('5 - A');
  expect(rows[0].unread).toBe(2);
});

test('withParentClassSections shows class and section for a parent instead of only Parent', () => {
  const [row] = withParentClassSections(
    [contact({ id: 'p1', name: 'Ramesh Sharma', role: 'Parent' })],
    [
      {
        id: 'stu-1',
        name: 'Amit Sharma',
        admissionNo: 'STU-14',
        parent: 'Ramesh Sharma',
        grade: '5',
        section: 'A',
      },
    ]
  );
  expect(formatChatIdentity(row)).toEqual({
    title: 'Ramesh Sharma',
    subtitle: 'Parent\nAmit Sharma · Class 5 · Section A',
  });
});

test('withParentClassSections adds the student name and id when class section is already known', () => {
  const [row] = withParentClassSections(
    [
      contact({
        id: 'p1',
        name: 'Ramesh Sharma',
        role: 'Parent',
        childClassLabel: 'I - A',
      }),
    ],
    [
      {
        id: 'stu-1',
        name: 'Amit Sharma',
        admissionNo: 'STU-14',
        parent: 'Ramesh Sharma',
        grade: 'I',
        section: 'A',
      },
    ]
  );
  expect(formatChatIdentity(row)).toEqual({
    title: 'Ramesh Sharma',
    subtitle: 'Parent\nAmit Sharma · I · Section A',
  });
});

test('withParentClassSections lists each child of the same parent on a separate line', () => {
  const [row] = withParentClassSections(
    [
      contact({
        id: 'p1',
        name: 'Ramesh Sharma',
        role: 'Parent',
        childName: 'Aarav Sharma',
        childClassLabel: 'I - A',
      }),
    ],
    [
      {
        id: 'stu-1',
        name: 'Aarav Sharma',
        admissionNo: 'itm/STU/26/0002',
        parent: 'Ramesh Sharma',
        grade: 'I',
        section: 'A',
      },
      {
        id: 'stu-2',
        name: 'Aarav Sharma',
        admissionNo: 'itm/STU/26/0003',
        parent: 'Ramesh Sharma',
        grade: 'II',
        section: 'B',
      },
    ]
  );
  expect(formatChatIdentity(row)).toEqual({
    title: 'Ramesh Sharma',
    subtitle: 'Parent\nAarav Sharma · I · Section A\nAarav Sharma · II · Section B',
  });
});

test('withParentClassSections shows class and section on a student chat', () => {
  const [row] = withParentClassSections(
    [contact({ id: 's1', name: 'Aarav Sharma', role: 'Student' })],
    [
      {
        id: 'stu-1',
        name: 'Aarav Sharma',
        grade: 'I',
        section: 'A',
      },
    ]
  );
  expect(formatChatIdentity(row)).toEqual({
    title: 'Aarav Sharma',
    subtitle: 'Student · I · Section A',
  });
});

test('formatChatIdentity shows the class a teacher is class teacher of', () => {
  expect(
    formatChatIdentity({
      name: 'Asha Rao',
      role: 'Teacher',
      designation: 'HOD',
      classTeacherOf: 'I · Section A',
    })
  ).toEqual({
    title: 'Asha Rao',
    subtitle: 'HOD · Teacher · Class teacher · I · Section A',
  });
});

test('withStaffRoles adds the class from the teacher record', () => {
  const [row] = withStaffRoles(
    [contact({ id: 't1', name: 'Asha Rao', role: 'Teacher' })],
    [{ id: 'teacher-1', name: 'Asha Rao', roleLabel: 'HOD', classTeacher: 'VI-A' }]
  );
  expect(formatChatIdentity(row)).toEqual({
    title: 'Asha Rao',
    subtitle: 'HOD · Teacher · Class teacher · VI · Section A',
  });
});

test('withStaffRoles labels the principal with designation and Principal', () => {
  const [row] = withStaffRoles(
    [contact({ id: 'self', name: 'Neha Singh', role: 'HOD' })],
    [{ name: 'Neha Singh', roleLabel: 'HOD', userId: 'user-neha' }],
    'user-neha'
  );
  expect(formatChatIdentity(row)).toEqual({
    title: 'Neha Singh',
    subtitle: 'HOD · Principal',
  });
});

test('withProfilePhotos uses the student, teacher, and driver photo in chat', () => {
  const rows = withProfilePhotos(
    [
      contact({ id: 's1', name: 'Aarav Sharma', role: 'Student', childId: 'stu-1' }),
      contact({
        id: 'p1',
        name: 'Rahul Sharma',
        role: 'Parent',
        photoUrl: 'https://cdn.example/parent.png',
      }),
      contact({ id: 't1', name: 'Asha Rao', role: 'Teacher' }),
      contact({ id: 'd1', name: 'Ravi Das', role: 'Driver' }),
    ],
    [{ id: 'stu-1', name: 'Aarav Sharma', photoUrl: 'https://cdn.example/student.png' }],
    [
      { name: 'Asha Rao', photoUrl: 'https://cdn.example/teacher.png' },
      { name: 'Ravi Das', photoUrl: 'https://cdn.example/driver.png' },
    ]
  );
  expect(rows.map((row) => row.photoUrl)).toEqual([
    'https://cdn.example/student.png',
    'https://cdn.example/parent.png',
    'https://cdn.example/teacher.png',
    'https://cdn.example/driver.png',
  ]);
});
