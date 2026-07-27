import { z } from 'zod';
import type {
  Class,
  Student,
  TimetableSlot,
  WeekDay,
  Assignment,
  AssignmentStatus,
  Announcement,
  AnnouncementType,
  CalendarEvent,
  EventType,
  LibraryBook,
  BookStatus,
  PayslipEntry,
  PayslipStatus,
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
  ApprovalRequest,
  PrincipalOverview,
  SchoolAttendance,
} from '@/data/domain';
import { initialsFrom } from './auth.schema';

// Auth/session mapping lives in ./auth.schema.ts. The schemas below are the zod
// boundary validators (and DTO source of truth) for the remaining modules. The
// backend serializes snake_case and wraps payloads (the httpClient already strips
// the {data}/{data,next_cursor} envelope before these schemas see the body).

// Backend DateTime fields arrive as ISO strings; the UI wants plain dates.
const dateOnly = (s?: string | null): string => (s ? s.slice(0, 10) : '');
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
function dayCount(from?: string | null, to?: string | null): number {
  if (!from || !to) return 1;
  const a = new Date(from.slice(0, 10)).getTime();
  const b = new Date(to.slice(0, 10)).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

// ─── Classes ─────────────────────────────────────────────────────────────────
export const classSchema = z.object({
  id: z.string(),
  name: z.string(),
  grade: z.string().nullish(),
  section: z.string().nullish(),
  subject: z.string().nullish(),
  room: z.string().nullish(),
  student_count: z.number().nullish(),
  next_period: z.string().nullish(),
});
export type ClassDTO = z.infer<typeof classSchema>;
export const toClass = (d: ClassDTO): Class => ({
  id: d.id,
  name: d.name,
  grade: d.grade ?? '',
  section: d.section ?? '',
  subject: d.subject ?? '',
  studentCount: d.student_count ?? 0,
  room: d.room ?? '',
  nextPeriod: d.next_period ?? undefined,
});

// ─── Students ────────────────────────────────────────────────────────────────
// StudentResponse has no class_id (the roster endpoint carries it in the path)
// and no initials; roll is an int. We inject classId and derive the rest.
export const studentSchema = z.object({
  id: z.string(),
  name: z.string(),
  roll: z.union([z.number(), z.string()]).nullish(),
  grade: z.string().nullish(),
  attendance_pct: z.number().nullish(),
  guardian_name: z.string().nullish(),
  guardian_phone: z.string().nullish(),
  photo_url: z.string().nullable().optional(),
});
export type StudentDTO = z.infer<typeof studentSchema>;
export const toStudent = (d: StudentDTO, classId = ''): Student => ({
  id: d.id,
  name: d.name,
  roll: d.roll != null ? String(d.roll) : '',
  initials: initialsFrom(d.name),
  classId,
  attendance: d.attendance_pct ?? 0,
  grade: d.grade ?? '',
  parent: d.guardian_name ?? '',
  parentPhone: d.guardian_phone ?? '',
  photoUrl: d.photo_url ?? null,
});

// ─── Timetable ───────────────────────────────────────────────────────────────
export const timetableSlotSchema = z.object({
  id: z.string(),
  day: z.string(),
  period: z.number(),
  subject: z.string().nullish(),
  class_id: z.string().nullish(),
  class_name: z.string().nullish(),
  room: z.string().nullish(),
  start_time: z.string().nullish(),
  end_time: z.string().nullish(),
  teacher_name: z.string().nullish(),
});
export type TimetableSlotDTO = z.infer<typeof timetableSlotSchema>;
export const toTimetableSlot = (d: TimetableSlotDTO): TimetableSlot => ({
  id: d.id,
  day: d.day as WeekDay,
  period: d.period,
  subject: d.subject ?? '',
  classId: d.class_id ?? '',
  className: d.class_name ?? '',
  room: d.room ?? '',
  startTime: d.start_time ?? '',
  endTime: d.end_time ?? '',
  teacherName: d.teacher_name ?? '',
});

// ─── Assignments ─────────────────────────────────────────────────────────────
export const assignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  class_id: z.string().nullish(),
  class_name: z.string().nullish(),
  subject: z.string().nullish(),
  due_date: z.string().nullish(),
  submissions_count: z.number().nullish(),
  total_students: z.number().nullish(),
  status: z.string(),
  description: z.string().nullish(),
  image_uri: z.string().nullish(),
});
export type AssignmentDTO = z.infer<typeof assignmentSchema>;
export const toAssignment = (d: AssignmentDTO): Assignment => ({
  id: d.id,
  title: d.title,
  classId: d.class_id ?? '',
  className: d.class_name ?? '',
  subject: d.subject ?? '',
  dueDate: dateOnly(d.due_date),
  submissionsCount: d.submissions_count ?? 0,
  totalStudents: d.total_students ?? 0,
  status: d.status as AssignmentStatus,
  description: d.description ?? undefined,
  imageUri: d.image_uri ?? undefined,
});

// ─── Announcements ───────────────────────────────────────────────────────────
export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().nullish(),
  date: z.string(),
  from: z.string().nullish(),
  type: z.string(),
  pinned: z.boolean().nullish(),
});
export type AnnouncementDTO = z.infer<typeof announcementSchema>;
export const toAnnouncement = (d: AnnouncementDTO): Announcement => ({
  id: d.id,
  title: d.title,
  body: d.body ?? '',
  date: dateOnly(d.date),
  from: d.from ?? '',
  type: d.type as AnnouncementType,
  pinned: d.pinned ?? false,
});

// ─── Calendar ────────────────────────────────────────────────────────────────
export const calendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  time: z.string().nullish(),
  type: z.string(),
  description: z.string().nullish(),
});
export type CalendarEventDTO = z.infer<typeof calendarEventSchema>;
export const toCalendarEvent = (d: CalendarEventDTO): CalendarEvent => ({
  id: d.id,
  title: d.title,
  date: dateOnly(d.date),
  time: d.time ?? undefined,
  type: d.type as EventType,
  description: d.description ?? undefined,
});

// ─── Library ─────────────────────────────────────────────────────────────────
export const libraryBookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  subject: z.string().nullish(),
  issued_to: z.string().nullish(),
  due_date: z.string().nullish(),
  status: z.string(),
});
export type LibraryBookDTO = z.infer<typeof libraryBookSchema>;
export const toLibraryBook = (d: LibraryBookDTO): LibraryBook => ({
  id: d.id,
  title: d.title,
  author: d.author,
  subject: d.subject ?? '',
  issuedTo: d.issued_to ?? undefined,
  dueDate: d.due_date ? dateOnly(d.due_date) : undefined,
  status: d.status as BookStatus,
});

// ─── Payroll ─────────────────────────────────────────────────────────────────
export const payslipSchema = z.object({
  id: z.string(),
  month: z.string().nullish(),
  year: z.number(),
  gross: z.number(),
  deductions: z.number(),
  net: z.number(),
  status: z.string(),
});
export type PayslipDTO = z.infer<typeof payslipSchema>;
export const toPayslip = (d: PayslipDTO): PayslipEntry => ({
  id: d.id,
  month: d.month ?? '',
  year: d.year,
  gross: d.gross,
  deductions: d.deductions,
  net: d.net,
  status: d.status as PayslipStatus,
});

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const dashboardStatsSchema = z.object({
  total_students: z.number(),
  total_classes: z.number(),
  attendance_today: z.number(),
  pending_assignments: z.number(),
  upcoming_exams: z.number(),
});
export type DashboardStatsDTO = z.infer<typeof dashboardStatsSchema>;
export const toDashboardStats = (d: DashboardStatsDTO): DashboardStats => ({
  totalStudents: d.total_students,
  totalClasses: d.total_classes,
  attendanceToday: d.attendance_today,
  pendingAssignments: d.pending_assignments,
  upcomingExams: d.upcoming_exams,
});

// ─── Exam papers ─────────────────────────────────────────────────────────────
// ExamPaperResponse has no topics or class_name — defaulted client-side.
export const examPaperSchema = z.object({
  id: z.string(),
  class_id: z.string().nullish(),
  name: z.string().nullish(),
  subject: z.string().nullish(),
  date: z.string().nullish(),
  start_time: z.string().nullish(),
  duration_min: z.number().nullish(),
  max_marks: z.number().nullish(),
  status: z.string(),
});
export type ExamPaperDTO = z.infer<typeof examPaperSchema>;
export const toExam = (d: ExamPaperDTO): Exam => ({
  id: d.id,
  title: d.name ?? '',
  classId: d.class_id ?? '',
  className: '',
  subject: d.subject ?? '',
  date: dateOnly(d.date),
  time: d.start_time ?? '',
  duration: d.duration_min ?? 0,
  maxMarks: d.max_marks ?? 0,
  topics: [],
  status: d.status as ExamStatus,
});
export const toExamDTO = (
  e: Partial<Exam> & { classId?: string; maxMarks?: number }
): Record<string, unknown> => ({
  ...(e.title !== undefined && { name: e.title }),
  ...(e.classId !== undefined && { class_id: e.classId }),
  ...(e.subject !== undefined && { subject: e.subject }),
  ...(e.date !== undefined && { date: e.date }),
  ...(e.time !== undefined && { start_time: e.time }),
  ...(e.duration !== undefined && { duration_min: e.duration }),
  ...(e.maxMarks !== undefined && { max_marks: e.maxMarks }),
  ...(e.status !== undefined && { status: e.status }),
});

// ─── Grades ──────────────────────────────────────────────────────────────────
export const gradeSchema = z.object({
  student_id: z.string(),
  student_name: z.string().nullish(),
  exam_paper_id: z.string(),
  marks: z.number(),
  max_marks: z.number(),
  grade: z.string().nullish(),
});
export type GradeDTO = z.infer<typeof gradeSchema>;
export const toGrade = (d: GradeDTO): GradeEntry => ({
  studentId: d.student_id,
  studentName: d.student_name ?? '',
  examId: d.exam_paper_id,
  marks: d.marks,
  maxMarks: d.max_marks,
  grade: d.grade ?? '',
});

// ─── Attendance (roll-call) ────────────────────────────────────────────────────
export type CanonicalAttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'holiday';
const ATT_WORD_TO_CODE: Record<CanonicalAttendanceStatus, AttendanceStatus> = {
  present: 'P',
  absent: 'A',
  late: 'L',
  leave: 'V',
  holiday: 'A',
};
const ATT_CODE_TO_WORD: Record<AttendanceStatus, CanonicalAttendanceStatus> = {
  P: 'present',
  A: 'absent',
  L: 'late',
  V: 'leave',
};
export const attendanceRecordSchema = z.object({
  student_id: z.string(),
  status: z.string(),
  date: z.string().nullish(),
});
export type AttendanceRecordDTO = z.infer<typeof attendanceRecordSchema>;
export const toAttendanceRecord = (d: AttendanceRecordDTO): AttendanceRecord => ({
  studentId: d.student_id,
  status: ATT_WORD_TO_CODE[d.status as CanonicalAttendanceStatus] ?? 'A',
  date: dateOnly(d.date),
});
export const fromAttendanceStatus = (s: AttendanceStatus): CanonicalAttendanceStatus =>
  ATT_CODE_TO_WORD[s];

// ─── Chat (threads) ────────────────────────────────────────────────────────────
// ChatThreadResponse has no initials/online — derived/defaulted.
export const chatContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().nullish(),
  last_message: z.string().nullish(),
  last_at: z.string().nullish(),
  unread: z.number().nullish(),
});
export type ChatContactDTO = z.infer<typeof chatContactSchema>;
export const toChatContact = (d: ChatContactDTO): ChatContact => ({
  id: d.id,
  name: d.name,
  role: d.role ?? '',
  initials: initialsFrom(d.name),
  lastMessage: d.last_message ?? '',
  time: d.last_at ?? '',
  unread: d.unread ?? 0,
  online: false,
});

export const chatMessageSchema = z.object({
  id: z.string(),
  sender_id: z.string().nullish(),
  text: z.string(),
  sent_at: z.string(),
  is_mine: z.boolean(),
});
export type ChatMessageDTO = z.infer<typeof chatMessageSchema>;
export const toChatMessage = (d: ChatMessageDTO): ChatMessage => ({
  id: d.id,
  senderId: d.sender_id ?? '',
  text: d.text,
  time: d.sent_at,
  isMe: d.is_mine,
});

// ─── Leave ───────────────────────────────────────────────────────────────────
export const leaveResponseSchema = z.object({
  id: z.string(),
  requester_id: z.string().nullish(),
  type: z.string(),
  from_date: z.string().nullish(),
  to_date: z.string().nullish(),
  reason: z.string().nullish(),
  substitute: z.string().nullish(),
  status: z.string(),
  applied_on: z.string().nullish(),
  decided_note: z.string().nullish(),
});
export type LeaveRequestDTO = z.infer<typeof leaveResponseSchema>;
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({
  id: d.id,
  type: d.type as LeaveType,
  from: dateOnly(d.from_date),
  to: dateOnly(d.to_date),
  reason: d.reason ?? '',
  substitute: d.substitute ?? undefined,
  status: d.status as LeaveStatus,
  appliedOn: dateOnly(d.applied_on),
});
export const fromNewLeave = (r: {
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  substitute?: string;
}): Record<string, unknown> => ({
  type: r.type,
  from_date: r.from,
  to_date: r.to,
  reason: r.reason,
  ...(r.substitute !== undefined && { substitute: r.substitute }),
});

// ─── Approvals ───────────────────────────────────────────────────────────────
// Backend /approvals returns LeaveResponse[]; the rich approval display fields
// (requester name/initials, title, detail, priority) are synthesized client-side.
export type ApprovalRequestDTO = z.infer<typeof leaveResponseSchema>;
export const approvalRequestSchema = leaveResponseSchema;
export const toApprovalRequest = (d: ApprovalRequestDTO): ApprovalRequest => {
  const days = dayCount(d.from_date, d.to_date);
  return {
    id: d.id,
    type: 'leave',
    requesterId: d.requester_id ?? '',
    requesterName: 'Staff member',
    requesterInitials: '—',
    title: `${cap(d.type)} leave · ${days} day${days > 1 ? 's' : ''}`,
    detail: d.reason ?? '',
    from: dateOnly(d.from_date),
    to: dateOnly(d.to_date),
    reason: d.reason ?? undefined,
    substitute: d.substitute ?? undefined,
    priority: 'medium',
    status: d.status as LeaveStatus,
    appliedOn: dateOnly(d.applied_on),
    decidedNote: d.decided_note ?? undefined,
  };
};

// ─── Principal overview ──────────────────────────────────────────────────────
const staffEntrySchema = z.object({
  teacher_id: z.string(),
  name: z.string(),
  initials: z.string(),
  subject: z.string().nullish(),
  phone: z.string().nullish(),
  checked_in: z.boolean(),
  check_in_at: z.string().nullish(),
  role: z.string().nullish(),
});
const toStaffEntry = (s: z.infer<typeof staffEntrySchema>) => ({
  teacherId: s.teacher_id,
  name: s.name,
  initials: s.initials,
  subject: s.subject ?? '',
  phone: s.phone ?? '',
  checkedIn: s.checked_in,
  checkInAt: s.check_in_at ?? undefined,
  role: s.role ?? undefined,
});

export const principalOverviewSchema = z.object({
  kpis: z.object({
    students_present_pct: z.number(),
    staff_present: z.number(),
    staff_total: z.number(),
    pending_approvals: z.number(),
  }),
  staff: z.array(staffEntrySchema),
});
export type PrincipalOverviewDTO = z.infer<typeof principalOverviewSchema>;
export const toPrincipalOverview = (d: PrincipalOverviewDTO): PrincipalOverview => ({
  kpis: {
    studentsPresentPct: d.kpis.students_present_pct,
    staffPresent: d.kpis.staff_present,
    staffTotal: d.kpis.staff_total,
    pendingApprovals: d.kpis.pending_approvals,
  },
  staff: d.staff.map(toStaffEntry),
});

export const schoolAttendanceSchema = z.object({
  date: z.string(),
  present_total: z.number(),
  student_total: z.number(),
  overall_pct: z.number(),
  classes: z.array(
    z.object({
      class_id: z.string(),
      class_name: z.string(),
      present: z.number(),
      total: z.number(),
      pct: z.number(),
    })
  ),
  staff: z.array(staffEntrySchema),
});
export type SchoolAttendanceDTO = z.infer<typeof schoolAttendanceSchema>;
export const toSchoolAttendance = (d: SchoolAttendanceDTO): SchoolAttendance => ({
  date: dateOnly(d.date),
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
  staff: d.staff.map(toStaffEntry),
});
