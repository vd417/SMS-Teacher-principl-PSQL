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
export type Tier = 'silver' | 'gold' | 'platinum';

export interface Tenant {
  id: string;
  name: string;
  tier: Tier;
  planName: string;
  /** Per-school logo from tenant branding (multi-tenant SaaS). */
  logoUrl?: string | null;
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
  /** Backend signals the account has no password yet → force a set-password screen. */
  mustSetPassword: boolean;
  photoUrl: string | null;
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
  /** The class's atomic grade (e.g. "I", "IX"), separate from `name` — some
   * backends populate `name` as the combined "Grade-Section" label instead
   * (e.g. "I-A"). Empty string when the backend has no grade set. */
  grade: string;
  section: string;
  subject: string;
  studentCount: number;
  room: string;
  nextPeriod?: string;
  /** dbo.Teachers.Id for the class homeroom teacher, when set by the API. */
  classTeacherId?: string;
}
export interface Student {
  id: string;
  name: string;
  roll: string;
  initials: string;
  classId: string;
  /** Official period attendance % from API; null when unmarked. */
  attendance: number | null;
  grade: string;
  parent: string;
  parentPhone: string;
  photoUrl: string | null;
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
  teacherName: string;
}
/** Exam term / datesheet published from sms-admin (GET /exams). */
export interface ExamTerm {
  id: string;
  name: string;
  published: boolean;
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
  /** Parent exam term when the paper belongs to a published datesheet. */
  examTermId?: string;
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
  /** Optional longer instructions shown on the homework card/detail. */
  description?: string;
  /** Optional attached image (data URI on web, file URI on native). */
  imageUri?: string;
  period?: number | null;
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
  /** Which student this parent thread is about — undefined for staff/group threads. */
  childName?: string;
  childClassLabel?: string;
  /** Read-receipt tick for the Inbox list preview — only meaningful when lastMessageMine. */
  lastMessageMine: boolean;
  lastMessageStatus?: 'sent' | 'delivered' | 'read';
}
export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
  imageUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
}
export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  from: string;
  type: AnnouncementType;
  pinned?: boolean;
  audience?: string;
}
export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  icon: string;
  tone: string;
  unread: boolean;
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
  basic?: number;
  hra?: number;
  allowances?: number;
  epf?: number;
  profTax?: number;
  otherDeductions?: number;
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
  decidedNote?: string;
  attachmentUrls?: string[];
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
  /** Requester's role/designation (e.g. "Teacher", "HOD", "Security"). */
  requesterRole: string;
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
  decidedByName?: string;
  attachmentUrls?: string[];
}

export interface StaffAttendanceEntry {
  teacherId: string;
  name: string;
  initials: string;
  subject: string;
  phone: string;
  checkedIn: boolean;
  checkInAt?: string; // ISO timestamp
  checkOutAt?: string; // ISO timestamp
  checkInVerified?: boolean;
  /** Teaching title (HOD, Senior Teacher, Teacher). Populated from API `designation` or legacy `role`. */
  designation?: string;
  /** Department/role for non-teaching staff (e.g. Security, Guard, Peon). Teachers group by subject. */
  role?: string;
}

/** Colleague row for the staff directory (teachers + principal chat/call list). */
export interface SchoolStaffMember {
  id: string;
  name: string;
  initials: string;
  phone?: string;
  /** Chat thread role label (e.g. Teacher, Principal, Security). */
  roleLabel: string;
  subtitle: string;
  photoUrl?: string;
  checkedIn?: boolean;
  checkInAt?: string;
  checkOutAt?: string;
  checkInVerified?: boolean;
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
  currentStopIndex: number;
  progress: number;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  nextStopName?: string;
  etaMinutes?: number;
  lastPingAt?: string;
}
export type FleetBusStatus = 'idle' | 'on_route' | 'at_stop' | 'delayed';
export interface FleetBus {
  busId: string;
  busNo: string;
  routeName?: string;
  driver?: string;
  driverPhone?: string;
  stopCount: number;
  studentsRiding: number;
  status: FleetBusStatus;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  nextStopName?: string;
  lastPingAt?: string;
  teacherUserId?: string;
  teacherName?: string;
  conductorStaffId?: string;
  /** Teachers who travel on this bus (commute) without being the duty teacher who manages it. */
  travelingTeachers?: { teacherUserId: string; teacherName: string }[];
  /** Ordered stops for drawing this bus's route on the fleet map, when the backend provides them. */
  stops?: BusStop[];
}
/** A bus tied to one of the teacher's classes, for read-only live location (not necessarily their duty bus). */
export interface MyRouteBus {
  busId: string;
  busNo: string;
  routeName?: string;
  isDutyTeacher: boolean;
  lat?: number;
  lng?: number;
  speedKmh?: number;
  nextStopName?: string;
  lastPingAt?: string;
}
export interface TransportBusRow {
  busId: string;
  busNo: string;
  routeName?: string;
  driver?: string;
  driverPhone?: string;
  stopCount: number;
  studentsAssigned: number;
  teacherUserId?: string;
  teacherName?: string;
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

// ─── PTM (parent-teacher meetings) ──────────────────────────────────────────
export type PtmStatus = 'pending' | 'confirmed';
export interface PtmMeeting {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  teacher: string;
  teacherId: string | null;
  subject: string | null;
  studentId: string;
  studentName: string;
  mode: string;
  status: PtmStatus;
}
