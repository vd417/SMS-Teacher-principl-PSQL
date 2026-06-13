import {
  toStudent,
  type StudentDTO,
  toExam,
  toExamDTO,
  type ExamPaperDTO,
  toGrade,
  type GradeDTO,
  toAttendanceRecord,
  fromAttendanceStatus,
  type AttendanceRecordDTO,
  toLeaveRequest,
  fromNewLeave,
  type LeaveRequestDTO,
  toAnnouncement,
  type AnnouncementDTO,
  toChatMessage,
  type ChatMessageDTO,
  toChatContact,
  type ChatContactDTO,
} from '@/data/http/mappers';

describe('StudentDTO canonical contract', () => {
  const dto: StudentDTO = {
    id: 's1',
    admission_no: 'ADM-001',
    name: 'Maya Patel',
    initials: 'MP',
    gender: 'F',
    class_id: 'c1',
    grade: '6',
    section: 'A',
    class_label: '6-A',
    roll: '12',
    guardian_name: 'Priya Patel',
    guardian_phone: '9876543210',
    attendance_pct: 92,
    fee_status: 'paid',
    fee_due: 0,
    house: 'Blue',
    avatar_hue: 210,
    status: 'active',
  };

  it('declares the canonical snake_case keys', () => {
    expect(Object.keys(dto).sort()).toEqual([
      'admission_no',
      'attendance_pct',
      'avatar_hue',
      'class_id',
      'class_label',
      'fee_due',
      'fee_status',
      'gender',
      'grade',
      'guardian_name',
      'guardian_phone',
      'house',
      'id',
      'initials',
      'name',
      'roll',
      'section',
      'status',
    ]);
  });

  it('maps to the existing domain Student shape', () => {
    expect(toStudent(dto)).toEqual({
      id: 's1',
      name: 'Maya Patel',
      roll: '12',
      initials: 'MP',
      classId: 'c1',
      attendance: 92,
      grade: '6',
      parent: 'Priya Patel',
      parentPhone: '9876543210',
    });
  });
});

describe('ExamPaperDTO canonical contract', () => {
  const dto: ExamPaperDTO = {
    id: 'p1',
    exam_id: 'e1',
    name: 'Mid-Term Algebra',
    class_id: 'c1',
    class_name: '6-A',
    subject: 'Math',
    date: '2026-06-15',
    start_time: '10:00 AM',
    duration_min: 60,
    max_marks: 50,
    room: 'R-101',
    invigilator1: 'T. Rao',
    invigilator2: 'S. Khan',
    topics: ['Algebra'],
    status: 'upcoming',
  };

  it('maps canonical paper fields to the domain Exam shape', () => {
    expect(toExam(dto)).toEqual({
      id: 'p1',
      title: 'Mid-Term Algebra',
      classId: 'c1',
      className: '6-A',
      subject: 'Math',
      date: '2026-06-15',
      time: '10:00 AM',
      duration: 60,
      maxMarks: 50,
      topics: ['Algebra'],
      status: 'upcoming',
    });
  });

  it('writes canonical snake_case keys from a domain patch', () => {
    expect(toExamDTO({ title: 'T', classId: 'c1', duration: 45, maxMarks: 20 })).toEqual({
      name: 'T',
      class_id: 'c1',
      duration_min: 45,
      max_marks: 20,
    });
  });
});

describe('GradeDTO canonical contract', () => {
  const dto: GradeDTO = {
    id: 'g1',
    student_id: 's1',
    student_name: 'Maya Patel',
    exam_paper_id: 'p1',
    marks: 42,
    max_marks: 50,
    grade: 'A',
    gpa: 3.7,
    pass: true,
    date: '2026-06-16',
  };

  it('maps exam_paper_id into the domain examId field', () => {
    expect(toGrade(dto)).toEqual({
      studentId: 's1',
      studentName: 'Maya Patel',
      examId: 'p1',
      marks: 42,
      maxMarks: 50,
      grade: 'A',
    });
  });
});

describe('AttendanceRecordDTO canonical contract', () => {
  it('maps canonical status words to the domain P/A/L/V codes', () => {
    const cases: [AttendanceRecordDTO['status'], string][] = [
      ['present', 'P'],
      ['absent', 'A'],
      ['late', 'L'],
      ['leave', 'V'],
    ];
    for (const [word, code] of cases) {
      const dto: AttendanceRecordDTO = { student_id: 's1', status: word, date: '2026-06-13' };
      expect(toAttendanceRecord(dto)).toEqual({
        studentId: 's1',
        status: code,
        date: '2026-06-13',
      });
    }
  });

  it('writes canonical status words from domain codes', () => {
    expect(fromAttendanceStatus('P')).toBe('present');
    expect(fromAttendanceStatus('V')).toBe('leave');
  });
});

describe('LeaveRequestDTO canonical contract', () => {
  const dto: LeaveRequestDTO = {
    id: 'l1',
    requester_id: 'u1',
    type: 'casual',
    from_date: '2026-07-01',
    to_date: '2026-07-02',
    reason: 'Family',
    substitute: 'T. Rao',
    status: 'pending',
    applied_on: '2026-06-20',
    decided_note: undefined,
  };

  it('maps from_date/to_date/applied_on to the domain from/to/appliedOn', () => {
    expect(toLeaveRequest(dto)).toEqual({
      id: 'l1',
      type: 'casual',
      from: '2026-07-01',
      to: '2026-07-02',
      reason: 'Family',
      substitute: 'T. Rao',
      status: 'pending',
      appliedOn: '2026-06-20',
    });
  });

  it('writes canonical snake_case keys for a new leave request', () => {
    expect(
      fromNewLeave({ type: 'sick', from: '2026-07-05', to: '2026-07-06', reason: 'Flu' })
    ).toEqual({ type: 'sick', from_date: '2026-07-05', to_date: '2026-07-06', reason: 'Flu' });
  });
});

describe('AnnouncementDTO canonical contract', () => {
  const dto: AnnouncementDTO = {
    id: 'a1',
    title: 'Holiday',
    body: 'School closed',
    date: '2026-06-13',
    from: 'Principal',
    role: 'principal',
    type: 'info',
    pinned: true,
    audience: 'all',
  };

  it('exposes role and audience and maps to the domain Announcement', () => {
    expect(dto.role).toBe('principal');
    expect(dto.audience).toBe('all');
    expect(toAnnouncement(dto)).toEqual({
      id: 'a1',
      title: 'Holiday',
      body: 'School closed',
      date: '2026-06-13',
      from: 'Principal',
      type: 'info',
      pinned: true,
    });
  });
});

describe('Chat DTO canonical contract', () => {
  const messageDto: ChatMessageDTO = {
    id: 'm1',
    thread_id: 'ch1',
    sender_id: 'ch1',
    text: 'Good morning!',
    sent_at: '9:00 AM',
    is_mine: false,
  };

  it('declares the canonical message keys (thread_id/sent_at/is_mine, not time/is_me)', () => {
    expect(Object.keys(messageDto).sort()).toEqual([
      'id',
      'is_mine',
      'sender_id',
      'sent_at',
      'text',
      'thread_id',
    ]);
    expect('time' in messageDto).toBe(false);
    expect('is_me' in messageDto).toBe(false);
  });

  it('maps sent_at→time and is_mine→isMe on the domain ChatMessage', () => {
    expect(toChatMessage(messageDto)).toEqual({
      id: 'm1',
      senderId: 'ch1',
      text: 'Good morning!',
      time: '9:00 AM',
      isMe: false,
    });
  });

  const contactDto: ChatContactDTO = {
    id: 'ch1',
    name: 'Principal Johnson',
    role: 'Principal',
    initials: 'PJ',
    last_message: 'Please submit the exam schedule by Friday.',
    last_at: '9:30 AM',
    unread: 2,
    online: true,
  };

  it('declares the canonical contact key last_at, not time', () => {
    expect('last_at' in contactDto).toBe(true);
    expect('time' in contactDto).toBe(false);
  });

  it('maps last_at→ domain time on the ChatContact', () => {
    expect(toChatContact(contactDto)).toEqual({
      id: 'ch1',
      name: 'Principal Johnson',
      role: 'Principal',
      initials: 'PJ',
      lastMessage: 'Please submit the exam schedule by Friday.',
      time: '9:30 AM',
      unread: 2,
      online: true,
    });
  });
});
