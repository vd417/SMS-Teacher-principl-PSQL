import type {
  Session,
  User,
  Tenant,
  Class,
  Student,
  TimetableSlot,
  Assignment,
  Announcement,
  CalendarEvent,
  LibraryBook,
  PayslipEntry,
  DashboardStats,
  Exam,
  GradeEntry,
  ExamStatus,
  AttendanceRecord,
  AttendanceStatus,
  ChatContact,
  ChatMessage,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  Role,
  ApprovalRequest,
  ApprovalRequestType,
  PrincipalOverview,
  SchoolAttendance,
} from '@/data/domain';
// Auth/session mapping lives in ./auth.schema.ts (zod-validated). The DTOs below
// cover the remaining modules.

export interface ClassDTO {
  id: string;
  name: string;
  section: string;
  subject: string;
  student_count: number;
  room: string;
  next_period?: string;
}
export const toClass = (d: ClassDTO): Class => ({
  id: d.id,
  name: d.name,
  section: d.section,
  subject: d.subject,
  studentCount: d.student_count,
  room: d.room,
  nextPeriod: d.next_period,
});

export interface StudentDTO {
  id: string;
  admission_no: string;
  name: string;
  initials: string;
  gender: 'M' | 'F';
  class_id: string;
  grade: string;
  section: string;
  class_label: string;
  roll: string;
  guardian_name: string;
  guardian_phone: string;
  attendance_pct: number;
  fee_status: 'paid' | 'partial' | 'due';
  fee_due: number;
  house: string;
  avatar_hue: number;
  status: 'active' | 'inactive';
}
export const toStudent = (d: StudentDTO): Student => ({
  id: d.id,
  name: d.name,
  roll: d.roll,
  initials: d.initials,
  classId: d.class_id,
  attendance: d.attendance_pct,
  grade: d.grade,
  parent: d.guardian_name,
  parentPhone: d.guardian_phone,
});

// ─── Timetable ───────────────────────────────────────────────────────────────
export interface TimetableSlotDTO {
  id: string;
  day: TimetableSlot['day'];
  period: number;
  subject: string;
  class_id: string;
  class_name: string;
  room: string;
  start_time: string;
  end_time: string;
}
export const toTimetableSlot = (d: TimetableSlotDTO): TimetableSlot => ({
  id: d.id,
  day: d.day,
  period: d.period,
  subject: d.subject,
  classId: d.class_id,
  className: d.class_name,
  room: d.room,
  startTime: d.start_time,
  endTime: d.end_time,
});

// ─── Assignments ─────────────────────────────────────────────────────────────
export interface AssignmentDTO {
  id: string;
  title: string;
  class_id: string;
  class_name: string;
  subject: string;
  due_date: string;
  submissions_count: number;
  total_students: number;
  status: Assignment['status'];
  description?: string;
  image_uri?: string;
}
export const toAssignment = (d: AssignmentDTO): Assignment => ({
  id: d.id,
  title: d.title,
  classId: d.class_id,
  className: d.class_name,
  subject: d.subject,
  dueDate: d.due_date,
  submissionsCount: d.submissions_count,
  totalStudents: d.total_students,
  status: d.status,
  description: d.description,
  imageUri: d.image_uri,
});

// ─── Announcements ───────────────────────────────────────────────────────────
export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  date: string;
  from: string;
  role?: string;
  type: Announcement['type'];
  pinned?: boolean;
  audience?: string;
}
export const toAnnouncement = (d: AnnouncementDTO): Announcement => ({
  id: d.id,
  title: d.title,
  body: d.body,
  date: d.date,
  from: d.from,
  type: d.type,
  pinned: d.pinned,
});

// ─── Calendar ────────────────────────────────────────────────────────────────
export interface CalendarEventDTO {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: CalendarEvent['type'];
  description?: string;
}
export const toCalendarEvent = (d: CalendarEventDTO): CalendarEvent => ({
  id: d.id,
  title: d.title,
  date: d.date,
  time: d.time,
  type: d.type,
  description: d.description,
});

// ─── Library ─────────────────────────────────────────────────────────────────
export interface LibraryBookDTO {
  id: string;
  title: string;
  author: string;
  subject: string;
  issued_to?: string;
  due_date?: string;
  status: LibraryBook['status'];
}
export const toLibraryBook = (d: LibraryBookDTO): LibraryBook => ({
  id: d.id,
  title: d.title,
  author: d.author,
  subject: d.subject,
  issuedTo: d.issued_to,
  dueDate: d.due_date,
  status: d.status,
});

// ─── Payroll ─────────────────────────────────────────────────────────────────
export interface PayslipDTO {
  id: string;
  month: string;
  year: number;
  gross: number;
  deductions: number;
  net: number;
  status: PayslipEntry['status'];
}
export const toPayslip = (d: PayslipDTO): PayslipEntry => ({
  id: d.id,
  month: d.month,
  year: d.year,
  gross: d.gross,
  deductions: d.deductions,
  net: d.net,
  status: d.status,
});

// ─── Exam papers ─────────────────────────────────────────────────────────────
export interface ExamPaperDTO {
  id: string;
  exam_id: string;
  name: string;
  class_id: string;
  class_name: string;
  subject: string;
  date: string;
  start_time: string;
  duration_min: number;
  max_marks: number;
  room: string;
  invigilator1: string;
  invigilator2: string;
  topics: string[];
  status: ExamStatus;
}
export const toExam = (d: ExamPaperDTO): Exam => ({
  id: d.id,
  title: d.name,
  classId: d.class_id,
  className: d.class_name,
  subject: d.subject,
  date: d.date,
  time: d.start_time,
  duration: d.duration_min,
  maxMarks: d.max_marks,
  topics: d.topics,
  status: d.status,
});
export const toExamDTO = (
  e: Partial<Exam> & { classId?: string; maxMarks?: number }
): Partial<ExamPaperDTO> => ({
  ...(e.id !== undefined && { id: e.id }),
  ...(e.title !== undefined && { name: e.title }),
  ...(e.classId !== undefined && { class_id: e.classId }),
  ...(e.className !== undefined && { class_name: e.className }),
  ...(e.subject !== undefined && { subject: e.subject }),
  ...(e.date !== undefined && { date: e.date }),
  ...(e.time !== undefined && { start_time: e.time }),
  ...(e.duration !== undefined && { duration_min: e.duration }),
  ...(e.maxMarks !== undefined && { max_marks: e.maxMarks }),
  ...(e.topics !== undefined && { topics: e.topics }),
  ...(e.status !== undefined && { status: e.status }),
});

// ─── Grades ──────────────────────────────────────────────────────────────────
export interface GradeDTO {
  id: string;
  student_id: string;
  student_name: string;
  exam_paper_id: string;
  marks: number;
  max_marks: number;
  grade: string;
  gpa: number;
  pass: boolean;
  date: string;
}
export const toGrade = (d: GradeDTO): GradeEntry => ({
  studentId: d.student_id,
  studentName: d.student_name,
  examId: d.exam_paper_id,
  marks: d.marks,
  maxMarks: d.max_marks,
  grade: d.grade,
});

// ─── Attendance (roll-call) ────────────────────────────────────────────────────
export type CanonicalAttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';

const ATT_WORD_TO_CODE: Record<CanonicalAttendanceStatus, AttendanceStatus> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  leave: 'V',
  // Domain has no holiday state; collapse to absent. No save path round-trips holiday, so this is one-way only.
  holiday: 'A',
};
const ATT_CODE_TO_WORD: Record<AttendanceStatus, CanonicalAttendanceStatus> = {
  P: 'present',
  A: 'absent',
  L: 'late',
  V: 'leave',
};

export interface AttendanceRecordDTO {
  student_id: string;
  status: CanonicalAttendanceStatus;
  date: string;
}
export const toAttendanceRecord = (d: AttendanceRecordDTO): AttendanceRecord => ({
  studentId: d.student_id,
  status: ATT_WORD_TO_CODE[d.status] ?? 'A',
  date: d.date,
});
export const fromAttendanceStatus = (s: AttendanceStatus): CanonicalAttendanceStatus =>
  ATT_CODE_TO_WORD[s];

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatContactDTO {
  id: string;
  name: string;
  role: string;
  initials: string;
  last_message: string;
  last_at: string;
  unread: number;
  online: boolean;
}
export const toChatContact = (d: ChatContactDTO): ChatContact => ({
  id: d.id,
  name: d.name,
  role: d.role,
  initials: d.initials,
  lastMessage: d.last_message,
  time: d.last_at,
  unread: d.unread,
  online: d.online,
});

export interface ChatMessageDTO {
  id: string;
  thread_id: string;
  sender_id: string;
  text: string;
  sent_at: string;
  is_mine: boolean;
}
export const toChatMessage = (d: ChatMessageDTO): ChatMessage => ({
  id: d.id,
  senderId: d.sender_id,
  text: d.text,
  time: d.sent_at,
  isMe: d.is_mine,
});

// ─── Leave ───────────────────────────────────────────────────────────────────
export type CanonicalLeaveType =
  | 'casual'
  | 'sick'
  | 'earned'
  | 'medical'
  | 'maternity'
  | 'emergency'
  | 'other';

export interface LeaveRequestDTO {
  id: string;
  requester_id: string;
  type: CanonicalLeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  substitute?: string;
  status: LeaveStatus;
  applied_on: string;
  decided_note?: string;
}
// Server sends only the domain-supported leave types; canonical union is wider, so we narrow.
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({
  id: d.id,
  type: d.type as LeaveType,
  from: d.from_date,
  to: d.to_date,
  reason: d.reason,
  substitute: d.substitute,
  status: d.status,
  appliedOn: d.applied_on,
});
export const fromNewLeave = (r: {
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  substitute?: string;
}): Partial<LeaveRequestDTO> => ({
  type: r.type,
  from_date: r.from,
  to_date: r.to,
  reason: r.reason,
  ...(r.substitute !== undefined && { substitute: r.substitute }),
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStatsDTO {
  total_students: number;
  total_classes: number;
  attendance_today: number;
  pending_assignments: number;
  upcoming_exams: number;
}
export const toDashboardStats = (d: DashboardStatsDTO): DashboardStats => ({
  totalStudents: d.total_students,
  totalClasses: d.total_classes,
  attendanceToday: d.attendance_today,
  pendingAssignments: d.pending_assignments,
  upcomingExams: d.upcoming_exams,
});

// ─── Approvals ───────────────────────────────────────────────────────────────
export interface ApprovalRequestDTO {
  id: string;
  type: ApprovalRequestType;
  requester_id: string;
  requester_name: string;
  requester_initials: string;
  title: string;
  detail: string;
  from?: string;
  to?: string;
  reason?: string;
  substitute?: string;
  priority: ApprovalRequest['priority'];
  status: ApprovalRequest['status'];
  applied_on: string;
  decided_note?: string;
}
export const toApprovalRequest = (d: ApprovalRequestDTO): ApprovalRequest => ({
  id: d.id,
  type: d.type,
  requesterId: d.requester_id,
  requesterName: d.requester_name,
  requesterInitials: d.requester_initials,
  title: d.title,
  detail: d.detail,
  from: d.from,
  to: d.to,
  reason: d.reason,
  substitute: d.substitute,
  priority: d.priority,
  status: d.status,
  appliedOn: d.applied_on,
  decidedNote: d.decided_note,
});

// ─── Principal overview ──────────────────────────────────────────────────────
export interface StaffAttendanceEntryDTO {
  teacher_id: string;
  name: string;
  initials: string;
  subject: string;
  phone: string;
  checked_in: boolean;
  check_in_at?: string;
  role?: string;
}
export interface PrincipalOverviewDTO {
  kpis: {
    students_present_pct: number;
    staff_present: number;
    staff_total: number;
    pending_approvals: number;
  };
  staff: StaffAttendanceEntryDTO[];
}
export const toPrincipalOverview = (d: PrincipalOverviewDTO): PrincipalOverview => ({
  kpis: {
    studentsPresentPct: d.kpis.students_present_pct,
    staffPresent: d.kpis.staff_present,
    staffTotal: d.kpis.staff_total,
    pendingApprovals: d.kpis.pending_approvals,
  },
  staff: d.staff.map((s) => ({
    teacherId: s.teacher_id,
    name: s.name,
    initials: s.initials,
    subject: s.subject,
    phone: s.phone,
    checkedIn: s.checked_in,
    checkInAt: s.check_in_at,
    role: s.role,
  })),
});

export interface ClassAttendanceSummaryDTO {
  class_id: string;
  class_name: string;
  present: number;
  total: number;
  pct: number;
}
export interface SchoolAttendanceDTO {
  date: string;
  present_total: number;
  student_total: number;
  overall_pct: number;
  classes: ClassAttendanceSummaryDTO[];
  staff: StaffAttendanceEntryDTO[];
}
export const toSchoolAttendance = (d: SchoolAttendanceDTO): SchoolAttendance => ({
  date: d.date,
  presentTotal: d.present_total,
  studentTotal: d.student_total,
  overallPct: d.overall_pct,
  classes: d.classes.map((c) => ({
    classId: c.class_id,
    className: c.class_name,
    present: c.present,
    total: c.total,
    pct: c.pct,
  })),
  staff: d.staff.map((s) => ({
    teacherId: s.teacher_id,
    name: s.name,
    initials: s.initials,
    subject: s.subject,
    phone: s.phone,
    checkedIn: s.checked_in,
    checkInAt: s.check_in_at,
    role: s.role,
  })),
});
