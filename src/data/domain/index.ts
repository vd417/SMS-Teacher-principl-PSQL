export type AttendanceStatus = 'P' | 'A' | 'L' | 'V';
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';
export type ExamStatus = 'upcoming' | 'completed' | 'draft';
export type AssignmentStatus = 'active' | 'due_soon' | 'overdue' | 'closed';
export type AnnouncementType = 'info' | 'warning' | 'event' | 'urgent';
export type EventType = 'exam' | 'holiday' | 'meeting' | 'event' | 'deadline';
export type LeaveType = 'casual' | 'sick' | 'emergency' | 'other';
export type LeaveStatus = 'approved' | 'pending' | 'rejected';
export type BookStatus = 'available' | 'issued' | 'overdue';
export type PayslipStatus = 'paid' | 'pending';
export type Role = 'teacher' | 'principal';

export interface Tenant {
  id: string;
  name: string;
}
export interface User {
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
}
export interface Session {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
}

export interface Class {
  id: string;
  name: string;
  section: string;
  subject: string;
  studentCount: number;
  room: string;
  nextPeriod?: string;
}
export interface Student {
  id: string;
  name: string;
  roll: string;
  initials: string;
  classId: string;
  attendance: number;
  grade: string;
  parent: string;
  parentPhone: string;
}
export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  date: string;
}
export interface TimetableSlot {
  id: string;
  day: WeekDay;
  period: number;
  subject: string;
  classId: string;
  className: string;
  room: string;
  startTime: string;
  endTime: string;
}
export interface Exam {
  id: string;
  title: string;
  classId: string;
  className: string;
  subject: string;
  date: string;
  time: string;
  duration: number;
  maxMarks: number;
  topics: string[];
  status: ExamStatus;
}
export interface GradeEntry {
  studentId: string;
  studentName: string;
  examId: string;
  marks: number;
  maxMarks: number;
  grade: string;
}
export interface Assignment {
  id: string;
  title: string;
  classId: string;
  className: string;
  subject: string;
  dueDate: string;
  submissionsCount: number;
  totalStudents: number;
  status: AssignmentStatus;
}
export interface ChatContact {
  id: string;
  name: string;
  role: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
}
export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
}
export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  from: string;
  type: AnnouncementType;
  pinned?: boolean;
}
export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  description?: string;
}
export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  subject: string;
  issuedTo?: string;
  dueDate?: string;
  status: BookStatus;
}
export interface PayslipEntry {
  id: string;
  month: string;
  year: number;
  gross: number;
  deductions: number;
  net: number;
  status: PayslipStatus;
}
export interface LeaveRequest {
  id: string;
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  substitute?: string;
  status: LeaveStatus;
  appliedOn: string;
}
export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  attendanceToday: number;
  pendingAssignments: number;
  upcomingExams: number;
}

export type ApprovalRequestType = 'leave' | 'attendance_correction';
export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  requesterId: string;
  requesterName: string;
  requesterInitials: string;
  title: string; // e.g. "Casual leave · 2 days"
  detail: string; // human-readable summary
  from?: string; // YYYY-MM-DD (leave range / correction date)
  to?: string; // YYYY-MM-DD
  reason?: string;
  substitute?: string;
  priority: 'high' | 'medium' | 'low';
  status: LeaveStatus; // 'pending' | 'approved' | 'rejected'
  appliedOn: string; // YYYY-MM-DD
  decidedNote?: string;
}

export interface StaffAttendanceEntry {
  teacherId: string;
  name: string;
  initials: string;
  subject: string;
  phone: string;
  checkedIn: boolean;
  checkInAt?: string; // ISO timestamp
  /** Department/role for non-teaching staff (e.g. Security, Guard, Peon). Teachers group by subject. */
  role?: string;
}
export interface PrincipalKpis {
  studentsPresentPct: number;
  staffPresent: number;
  staffTotal: number;
  pendingApprovals: number;
}
export interface PrincipalOverview {
  kpis: PrincipalKpis;
  staff: StaffAttendanceEntry[];
}

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  present: number;
  total: number;
  pct: number; // 0..100
}
export interface SchoolAttendance {
  date: string; // YYYY-MM-DD
  presentTotal: number;
  studentTotal: number;
  overallPct: number; // 0..100
  classes: ClassAttendanceSummary[];
  staff: StaffAttendanceEntry[];
}

export type BoardingStatus = 'pending' | 'boarded' | 'absent';

export interface BusStop {
  id: string;
  name: string;
  time: string; // scheduled time, e.g. "07:45"
  order: number;
  lat: number;
  lng: number;
}
export interface Bus {
  id: string;
  number: string; // e.g. "WBA-07"
  routeName: string; // e.g. "North Loop"
  driver: string;
  driverPhone: string;
  stops: BusStop[];
}
export interface BusPosition {
  busId: string;
  currentStopIndex: number; // index into stops[]
  progress: number; // 0..1 between currentStop and the next stop
  lat: number;
  lng: number;
  nextStopName: string;
  etaMinutes: number;
}
export interface BoardingRecord {
  studentId: string;
  studentName: string;
  initials: string;
  stopId: string;
  status: BoardingStatus;
}

// ─── Teacher self check-in (geofenced) ───────────────────────────────────────
export interface SchoolLocation {
  lat: number;
  lng: number;
  radiusMeters: number; // mock defaults to 10
  name: string;
}

export type CheckEventKind = 'in' | 'out';

export interface CheckEvent {
  kind: CheckEventKind;
  at: string; // ISO timestamp
  lat: number;
  lng: number;
  accuracyMeters: number; // GPS-reported accuracy
  distanceMeters: number; // computed distance to the school
  verified: boolean; // distance <= radius + min(accuracy, ACCURACY_CAP)
}

export interface TeacherAttendanceDay {
  date: string; // YYYY-MM-DD
  checkIn?: CheckEvent;
  checkOut?: CheckEvent;
}

export interface TeacherAttendanceSummary {
  daysPresent: number;
  daysFlagged: number; // days with any unverified punch
  totalHours: number; // sum of (checkOut - checkIn)
}
