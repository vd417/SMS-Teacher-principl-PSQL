import {
  studentSchema,
  toStudent,
  examPaperSchema,
  toExam,
  toExamDTO,
  chatContactSchema,
  toChatContact,
  approvalRequestSchema,
  toApprovalRequest,
  leaveResponseSchema,
  toLeaveRequest,
  timetableSlotSchema,
  toTimetableSlot,
  classSchema,
  toClass,
  principalOverviewSchema,
  toPrincipalOverview,
  announcementSchema,
  toAnnouncement,
  notificationSchema,
  toNotification,
  attendanceRecordSchema,
  toAttendanceRecord,
  ptmMeetingSchema,
  toPtmMeeting,
} from '../mappers';

test('toStudent injects classId, stringifies roll, derives initials', () => {
  const dto = studentSchema.parse({
    id: 's1',
    name: 'Ravi Kumar',
    roll: 12,
    grade: '9',
    attendance_pct: 91 as number | null,
    guardian_name: 'Asha',
    guardian_phone: '999',
  });
  const s = toStudent(dto, 'c1');
  expect(s.classId).toBe('c1');
  expect(s.roll).toBe('12');
  expect(s.initials).toBe('RK');
  expect(s.attendance).toBe(91);
  expect(s.parent).toBe('Asha');
});

test('toStudent maps null attendance_pct to null (not marked)', () => {
  const dto = studentSchema.parse({
    id: 's2',
    name: 'No Marks',
    roll: 1,
    attendance_pct: null,
  });
  expect(toStudent(dto, 'c1').attendance).toBeNull();
});

test('toExam maps scheduled CRM status to upcoming and exam_id to examTermId', () => {
  const dto = examPaperSchema.parse({
    id: 'e2',
    exam_id: 'term-1',
    class_id: 'c1',
    name: 'Unit test',
    subject: 'Science',
    date: '2026-08-01T00:00:00',
    start_time: '10:00',
    duration_min: 60,
    max_marks: 50,
    status: 'scheduled',
  });
  const e = toExam(dto);
  expect(e.status).toBe('upcoming');
  expect(e.examTermId).toBe('term-1');
});

test('toExam defaults className that the backend does not send and parses topics', () => {
  const dto = examPaperSchema.parse({
    id: 'e1',
    class_id: 'c1',
    name: 'Mid-term',
    subject: 'Math',
    date: '2026-07-01T00:00:00',
    start_time: '09:00',
    duration_min: 90,
    max_marks: 100,
    topics: 'Algebra, Geometry',
    status: 'upcoming',
  });
  const e = toExam(dto);
  expect(e.title).toBe('Mid-term');
  expect(e.className).toBe('');
  expect(e.topics).toEqual(['Algebra', 'Geometry']);
  expect(e.date).toBe('2026-07-01');
  expect(e.maxMarks).toBe(100);
});

test('toExamDTO maps exam paper fields to snake_case wire format', () => {
  expect(
    toExamDTO({
      title: 'Mid-term',
      subject: 'Math',
      classId: 'c1',
      date: '2026-07-01',
      time: '09:00',
      duration: 90,
      maxMarks: 100,
      topics: ['Algebra', 'Geometry'],
      status: 'upcoming',
    })
  ).toEqual({
    name: 'Mid-term',
    subject: 'Math',
    class_id: 'c1',
    date: '2026-07-01',
    start_time: '09:00',
    duration_min: 90,
    max_marks: 100,
    topics: 'Algebra, Geometry',
    status: 'upcoming',
  });
});

test('toChatContact derives initials and maps online', () => {
  const dto = chatContactSchema.parse({
    id: 't1',
    name: 'Meera Nair',
    role: 'parent',
    last_message: 'Hi',
    last_at: '2026-06-22T08:00:00',
    unread: 2,
    online: true,
  });
  const c = toChatContact(dto);
  expect(c.initials).toBe('MN');
  expect(c.online).toBe(true);
  expect(c.unread).toBe(2);
  expect(c.childName).toBeUndefined();
  expect(c.childClassLabel).toBeUndefined();
  expect(c.lastMessageMine).toBe(false);
  expect(c.lastMessageStatus).toBeUndefined();
});

test("toChatContact surfaces the read-receipt tick for the teacher's own last message", () => {
  const dto = chatContactSchema.parse({
    id: 't3',
    name: 'Meera Nair',
    last_message_mine: true,
    last_message_status: 'read',
  });
  const c = toChatContact(dto);
  expect(c.lastMessageMine).toBe(true);
  expect(c.lastMessageStatus).toBe('read');
});

test('toChatContact surfaces which child a parent thread is about', () => {
  const dto = chatContactSchema.parse({
    id: 't2',
    name: 'Parent Contact',
    role: 'Parent',
    child_name: 'Kid Rahul',
    child_class_label: 'Grade 5 - A',
  });
  const c = toChatContact(dto);
  expect(c.childName).toBe('Kid Rahul');
  expect(c.childClassLabel).toBe('Grade 5 - A');
});

test('toApprovalRequest synthesizes title/priority from a LeaveResponse', () => {
  const dto = approvalRequestSchema.parse({
    id: 'a1',
    requester_id: 'u9',
    type: 'casual',
    from_date: '2026-07-01',
    to_date: '2026-07-02',
    reason: 'Family event',
    status: 'pending',
    applied_on: '2026-06-20T00:00:00',
  });
  const a = toApprovalRequest(dto);
  expect(a.type).toBe('leave');
  expect(a.title).toBe('Casual leave · 2 days');
  expect(a.priority).toBe('medium');
  expect(a.detail).toBe('Family event');
  expect(a.appliedOn).toBe('2026-06-20');
});

test('toApprovalRequest uses requester_name and attachment_urls', () => {
  const dto = approvalRequestSchema.parse({
    id: 'a2',
    requester_id: 'u9',
    requester_name: 'Asha Rao',
    type: 'sick',
    from_date: '2026-07-01',
    to_date: '2026-07-01',
    reason: 'Fever',
    status: 'pending',
    applied_on: '2026-06-20',
    attachment_urls: '["https://example.com/doc.jpg"]',
  });
  const a = toApprovalRequest(dto);
  expect(a.requesterName).toBe('Asha Rao');
  expect(a.requesterInitials).toBe('AR');
  expect(a.attachmentUrls).toEqual(['https://example.com/doc.jpg']);
});

test('toApprovalRequest maps requester_role, falling back to Teacher', () => {
  const withRole = toApprovalRequest(
    approvalRequestSchema.parse({
      id: 'a5',
      requester_id: 'u9',
      requester_name: 'Guard One',
      requester_role: 'Security',
      type: 'casual',
      from_date: '2026-07-01',
      to_date: '2026-07-01',
      status: 'pending',
      applied_on: '2026-06-20',
    })
  );
  expect(withRole.requesterRole).toBe('Security');

  const withoutRole = toApprovalRequest(
    approvalRequestSchema.parse({
      id: 'a6',
      requester_id: 'u9',
      requester_name: 'Someone',
      type: 'casual',
      from_date: '2026-07-01',
      to_date: '2026-07-01',
      status: 'pending',
      applied_on: '2026-06-20',
    })
  );
  expect(withoutRole.requesterRole).toBe('Teacher');
});

test('toApprovalRequest maps decided_by_name', () => {
  const dto = approvalRequestSchema.parse({
    id: 'a3',
    requester_id: 'u9',
    requester_name: 'Asha Rao',
    type: 'casual',
    from_date: '2026-07-01',
    to_date: '2026-07-01',
    reason: 'Family event',
    status: 'approved',
    applied_on: '2026-06-20',
    decided_note: 'Covered',
    decided_by_name: 'Priya Principal',
  });
  const a = toApprovalRequest(dto);
  expect(a.decidedByName).toBe('Priya Principal');
  expect(a.decidedNote).toBe('Covered');
});

test('toLeaveRequest maps decided_note and attachment_urls', () => {
  const dto = leaveResponseSchema.parse({
    id: 'l2',
    type: 'casual',
    from_date: '2026-07-01',
    to_date: '2026-07-02',
    reason: 'Trip',
    status: 'rejected',
    applied_on: '2026-06-29',
    decided_note: 'Peak exam week',
    attachment_urls: ['data:image/jpeg;base64,abc'],
  });
  const l = toLeaveRequest(dto);
  expect(l.decidedNote).toBe('Peak exam week');
  expect(l.attachmentUrls).toEqual(['data:image/jpeg;base64,abc']);
});

test('toLeaveRequest normalizes dates and keeps the wire type', () => {
  const dto = leaveResponseSchema.parse({
    id: 'l1',
    type: 'sick',
    from_date: '2026-07-01T00:00:00',
    to_date: '2026-07-01T00:00:00',
    reason: 'Flu',
    status: 'approved',
    applied_on: '2026-06-29',
  });
  const l = toLeaveRequest(dto);
  expect(l.from).toBe('2026-07-01');
  expect(l.type).toBe('sick');
  expect(l.status).toBe('approved');
});

test('toTimetableSlot maps teacher_name to teacherName', () => {
  const dto = timetableSlotSchema.parse({
    id: 't1',
    day: 'Mon',
    period: 1,
    subject: 'Science',
    class_id: 'c1',
    class_name: 'IX-A',
    room: '101',
    start_time: '08:00',
    end_time: '08:45',
    teacher_name: 'Asha Rao',
  });
  const slot = toTimetableSlot(dto);
  expect(slot.teacherName).toBe('Asha Rao');
});

test('toTimetableSlot defaults teacherName to empty string when the subject has no assigned teacher', () => {
  const dto = timetableSlotSchema.parse({
    id: 't2',
    day: 'Tue',
    period: 2,
    subject: 'Unassigned Subject',
  });
  const slot = toTimetableSlot(dto);
  expect(slot.teacherName).toBe('');
});

test('toClass reads the backend grade field separately from name', () => {
  const dto = classSchema.parse({
    id: 'c1',
    name: 'I-A',
    grade: 'I',
    section: 'A',
    subject: 'Math',
    room: '101',
  });
  const c = toClass(dto);
  expect(c.name).toBe('I-A');
  expect(c.grade).toBe('I');
  expect(c.section).toBe('A');
});

test('toClass defaults grade to an empty string when the backend omits it', () => {
  const dto = classSchema.parse({
    id: 'c1',
    name: 'C1',
    section: 'A',
    subject: 'Math',
    room: '101',
  });
  const c = toClass(dto);
  expect(c.grade).toBe('');
});

test('toPrincipalOverview maps legacy teacher role into designation', () => {
  const overview = toPrincipalOverview(
    principalOverviewSchema.parse({
      kpis: {
        students_present_pct: 80,
        staff_present: 1,
        staff_total: 2,
        pending_approvals: 0,
      },
      staff: [
        {
          teacher_id: 't1',
          name: 'Rina Pandey',
          initials: 'RP',
          subject: 'Science',
          phone: '9000000001',
          checked_in: false,
          role: 'HOD',
        },
        {
          teacher_id: 's1',
          name: 'Gate Guard',
          initials: 'GG',
          subject: null,
          phone: '9000000002',
          checked_in: true,
          role: 'Security',
        },
      ],
    })
  );

  expect(overview.staff[0]).toMatchObject({
    designation: 'HOD',
    role: undefined,
  });
  expect(overview.staff[1]).toMatchObject({
    designation: undefined,
    role: 'Security',
  });
});

test('toPrincipalOverview keeps explicit designation and role separate', () => {
  const overview = toPrincipalOverview(
    principalOverviewSchema.parse({
      kpis: {
        students_present_pct: 0,
        staff_present: 0,
        staff_total: 1,
        pending_approvals: 0,
      },
      staff: [
        {
          teacher_id: 't1',
          name: 'Amit Yadav',
          initials: 'AY',
          subject: 'Math',
          checked_in: false,
          designation: 'Senior Teacher',
          role: null,
        },
      ],
    })
  );

  expect(overview.staff[0]).toMatchObject({
    designation: 'Senior Teacher',
    role: undefined,
  });
});

test('toAnnouncement maps CRM type strings and preserves audience', () => {
  const dto = announcementSchema.parse({
    id: 'a1',
    title: 'Sports Day',
    body: 'Friday 9am',
    date: '2026-07-16T00:00:00Z',
    from: 'Principal Rao',
    type: 'general',
    pinned: false,
    audience: 'teachers',
  });
  const ann = toAnnouncement(dto);
  expect(ann.type).toBe('info');
  expect(ann.audience).toBe('teachers');
  expect(ann.date).toBe('2026-07-16');
});

test('toNotification defaults icon/tone/unread from wire payload', () => {
  const dto = notificationSchema.parse({
    id: 'n1',
    title: 'Announcement: Sports Day',
    body: 'Friday 9am',
    time: '2m ago',
    unread: true,
  });
  expect(toNotification(dto)).toEqual({
    id: 'n1',
    title: 'Announcement: Sports Day',
    body: 'Friday 9am',
    time: '2m ago',
    icon: 'bell',
    tone: 'brand',
    unread: true,
  });
});

test('toAttendanceRecord normalizes mixed-case and single-letter statuses', () => {
  const dto = attendanceRecordSchema.parse({
    student_id: 's1',
    status: 'Present',
    date: '2026-07-29T00:00:00',
  });
  expect(toAttendanceRecord(dto)).toEqual({
    studentId: 's1',
    status: 'P',
    date: '2026-07-29',
  });
});

test('toPtmMeeting maps a null subject and teacher_id through, and child/student_name to domain names', () => {
  const dto = ptmMeetingSchema.parse({
    id: 'ptm-1',
    date: '2026-08-27',
    time: '10:30',
    teacher: 'Mrs. Rao',
    teacher_id: null,
    subject: null,
    child: 'student-1',
    mode: 'In person',
    status: 'confirmed',
    student_name: 'Aarav Sharma',
  });
  expect(toPtmMeeting(dto)).toEqual({
    id: 'ptm-1',
    date: '2026-08-27',
    time: '10:30',
    teacher: 'Mrs. Rao',
    teacherId: null,
    subject: null,
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    mode: 'In person',
    status: 'confirmed',
  });
});
