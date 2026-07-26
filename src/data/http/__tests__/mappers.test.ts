import {
  studentSchema,
  toStudent,
  examPaperSchema,
  toExam,
  chatContactSchema,
  toChatContact,
  approvalRequestSchema,
  toApprovalRequest,
  leaveResponseSchema,
  toLeaveRequest,
  timetableSlotSchema,
  toTimetableSlot,
} from '../mappers';

test('toStudent injects classId, stringifies roll, derives initials', () => {
  const dto = studentSchema.parse({
    id: 's1',
    name: 'Ravi Kumar',
    roll: 12,
    grade: '9',
    attendance_pct: 91,
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

test('toExam defaults className and topics that the backend does not send', () => {
  const dto = examPaperSchema.parse({
    id: 'e1',
    class_id: 'c1',
    name: 'Mid-term',
    subject: 'Math',
    date: '2026-07-01T00:00:00',
    start_time: '09:00',
    duration_min: 90,
    max_marks: 100,
    status: 'upcoming',
  });
  const e = toExam(dto);
  expect(e.title).toBe('Mid-term');
  expect(e.className).toBe('');
  expect(e.topics).toEqual([]);
  expect(e.date).toBe('2026-07-01');
  expect(e.maxMarks).toBe(100);
});

test('toChatContact derives initials and defaults online=false', () => {
  const dto = chatContactSchema.parse({
    id: 't1',
    name: 'Meera Nair',
    role: 'parent',
    last_message: 'Hi',
    last_at: '2026-06-22T08:00:00',
    unread: 2,
  });
  const c = toChatContact(dto);
  expect(c.initials).toBe('MN');
  expect(c.online).toBe(false);
  expect(c.unread).toBe(2);
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
