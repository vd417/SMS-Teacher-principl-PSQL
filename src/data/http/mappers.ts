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
    role: 'teacher';
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
