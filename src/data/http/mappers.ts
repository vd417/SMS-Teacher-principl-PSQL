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
} from '@/data/domain';

export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    initials: string;
    title: string;
    email: string;
    phone: string;
    employee: string;
    classroom: string;
    joined: string;
    role: Role;
  };
  tenant: { id: string; name: string };
}

export const toUser = (d: SessionDTO['user']): User => ({ ...d });
export const toTenant = (d: SessionDTO['tenant']): Tenant => ({ ...d });
export const toSession = (d: SessionDTO): Session => ({
  accessToken: d.access_token,
  refreshToken: d.refresh_token,
  user: toUser(d.user),
  tenant: toTenant(d.tenant),
});

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
  name: string;
  roll: string;
  initials: string;
  class_id: string;
  attendance: number;
  grade: string;
  parent: string;
  parent_phone: string;
}
export const toStudent = (d: StudentDTO): Student => ({
  id: d.id,
  name: d.name,
  roll: d.roll,
  initials: d.initials,
  classId: d.class_id,
  attendance: d.attendance,
  grade: d.grade,
  parent: d.parent,
  parentPhone: d.parent_phone,
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
});

// ─── Announcements ───────────────────────────────────────────────────────────
export interface AnnouncementDTO {
  id: string;
  title: string;
  body: string;
  date: string;
  from: string;
  type: Announcement['type'];
  pinned?: boolean;
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

// ─── Exams ───────────────────────────────────────────────────────────────────
export interface ExamDTO {
  id: string;
  title: string;
  class_id: string;
  class_name: string;
  subject: string;
  date: string;
  time: string;
  duration: number;
  max_marks: number;
  topics: string[];
  status: ExamStatus;
}
export const toExam = (d: ExamDTO): Exam => ({
  id: d.id,
  title: d.title,
  classId: d.class_id,
  className: d.class_name,
  subject: d.subject,
  date: d.date,
  time: d.time,
  duration: d.duration,
  maxMarks: d.max_marks,
  topics: d.topics,
  status: d.status,
});
export const toExamDTO = (
  e: Partial<Exam> & { classId?: string; maxMarks?: number }
): Partial<ExamDTO> => ({
  ...(e.id !== undefined && { id: e.id }),
  ...(e.title !== undefined && { title: e.title }),
  ...(e.classId !== undefined && { class_id: e.classId }),
  ...(e.className !== undefined && { class_name: e.className }),
  ...(e.subject !== undefined && { subject: e.subject }),
  ...(e.date !== undefined && { date: e.date }),
  ...(e.time !== undefined && { time: e.time }),
  ...(e.duration !== undefined && { duration: e.duration }),
  ...(e.maxMarks !== undefined && { max_marks: e.maxMarks }),
  ...(e.topics !== undefined && { topics: e.topics }),
  ...(e.status !== undefined && { status: e.status }),
});

// ─── Grades ──────────────────────────────────────────────────────────────────
export interface GradeDTO {
  student_id: string;
  student_name: string;
  exam_id: string;
  marks: number;
  max_marks: number;
  grade: string;
}
export const toGrade = (d: GradeDTO): GradeEntry => ({
  studentId: d.student_id,
  studentName: d.student_name,
  examId: d.exam_id,
  marks: d.marks,
  maxMarks: d.max_marks,
  grade: d.grade,
});

// ─── Attendance ──────────────────────────────────────────────────────────────
export interface AttendanceRecordDTO {
  student_id: string;
  status: AttendanceStatus;
  date: string;
}
export const toAttendanceRecord = (d: AttendanceRecordDTO): AttendanceRecord => ({
  studentId: d.student_id,
  status: d.status,
  date: d.date,
});

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatContactDTO {
  id: string;
  name: string;
  role: string;
  initials: string;
  last_message: string;
  time: string;
  unread: number;
  online: boolean;
}
export const toChatContact = (d: ChatContactDTO): ChatContact => ({
  id: d.id,
  name: d.name,
  role: d.role,
  initials: d.initials,
  lastMessage: d.last_message,
  time: d.time,
  unread: d.unread,
  online: d.online,
});

export interface ChatMessageDTO {
  id: string;
  sender_id: string;
  text: string;
  time: string;
  is_me: boolean;
}
export const toChatMessage = (d: ChatMessageDTO): ChatMessage => ({
  id: d.id,
  senderId: d.sender_id,
  text: d.text,
  time: d.time,
  isMe: d.is_me,
});

// ─── Leave ───────────────────────────────────────────────────────────────────
export interface LeaveRequestDTO {
  id: string;
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  substitute?: string;
  status: LeaveStatus;
  applied_on: string;
}
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({
  id: d.id,
  type: d.type,
  from: d.from,
  to: d.to,
  reason: d.reason,
  substitute: d.substitute,
  status: d.status,
  appliedOn: d.applied_on,
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
