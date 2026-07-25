import type {
  Session,
  User,
  Class,
  Student,
  AttendanceRecord,
  TimetableSlot,
  Exam,
  GradeEntry,
  Assignment,
  ChatContact,
  ChatMessage,
  Announcement,
  CalendarEvent,
  LibraryBook,
  PayslipEntry,
  LeaveRequest,
  DashboardStats,
  ExamStatus,
  Bus,
  BusPosition,
  BoardingRecord,
  SchoolLocation,
  CheckEvent,
  TeacherAttendanceDay,
  TeacherAttendanceSummary,
  ApprovalRequest,
  PrincipalOverview,
  SchoolAttendance,
} from '@/data/domain';
import type { Page } from '@/lib/envelope';

export interface NewExamInput {
  title: string;
  classId: string;
  date: string;
  time: string;
  duration: number;
  maxMarks: number;
  topics: string[];
  status: ExamStatus;
}
export interface NewAssignmentInput {
  title: string;
  classId: string;
  dueDate: string;
  description?: string;
  imageUri?: string;
}
export interface NewLeaveInput {
  type: LeaveRequest['type'];
  from: string;
  to: string;
  reason: string;
  substitute?: string;
}
export interface NewAnnouncementInput {
  title: string;
  body: string;
  type: Announcement['type'];
}
export interface GradeInput {
  studentId: string;
  examId: string;
  marks: number;
}

export interface OtpChallenge {
  channel: 'sms' | 'email';
  destination: string; // masked, e.g. "••••0118" or "a••@westbrook.edu"
}

export interface SchoolChoice {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface AuthRepository {
  login(identifier: string, password: string): Promise<Session>;
  // The backend returns tokens only; identity is fetched separately via me().
  refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
  me(): Promise<User>;
  logout(refreshToken: string): Promise<void>;
  requestOtp(identifier: string): Promise<OtpChallenge>;
  verifyOtp(identifier: string, code: string): Promise<Session>;
  forgotPassword(identifier: string): Promise<void>;
  resetPassword(identifier: string, code: string, password: string): Promise<void>;
  setPassword(password: string): Promise<void>;
  // A signed-in identity can own more than one Users row (invited to several
  // schools under the same email/phone). listMySchools lists all of them;
  // switchSchool reissues tokens scoped to one specific row/tenant.
  listMySchools(): Promise<SchoolChoice[]>;
  switchSchool(tenantId: string): Promise<Session>;
  updatePhoto(photoUrl: string | null): Promise<void>;
}
export interface ClassesRepository {
  list(): Promise<Class[]>;
  get(id: string): Promise<Class>;
}
export interface StudentsRepository {
  // The class roster is the one truly cursor-paginated list (limit 1–200, cursor).
  listByClass(classId: string, page?: { limit?: number; cursor?: string }): Promise<Page<Student>>;
  get(id: string): Promise<Student>;
  // Teacher-driven, not self-service — students don't sign into this app.
  updatePhoto(studentId: string, photoUrl: string | null): Promise<Student>;
}
export interface AttendanceRepository {
  forClass(classId: string, date: string): Promise<AttendanceRecord[]>;
  save(classId: string, date: string, records: AttendanceRecord[]): Promise<void>;
}
export interface MyAttendanceRepository {
  schoolLocation(): Promise<SchoolLocation>;
  today(): Promise<TeacherAttendanceDay>;
  history(limit: number): Promise<TeacherAttendanceDay[]>;
  summary(month: string): Promise<TeacherAttendanceSummary>; // 'YYYY-MM'
  punch(event: CheckEvent): Promise<TeacherAttendanceDay>;
}
export interface TimetableRepository {
  list(): Promise<TimetableSlot[]>;
}
export interface ExamsRepository {
  list(): Promise<Exam[]>;
  get(id: string): Promise<Exam>;
  create(input: NewExamInput): Promise<Exam>;
  update(id: string, patch: Partial<NewExamInput>): Promise<Exam>;
  remove(id: string): Promise<void>;
}
export interface GradesRepository {
  listByExam(examId: string): Promise<GradeEntry[]>;
  upsert(input: GradeInput): Promise<GradeEntry>;
}
export interface AssignmentsRepository {
  list(): Promise<Assignment[]>;
  create(input: NewAssignmentInput): Promise<Assignment>;
}
export interface ChatRepository {
  contacts(): Promise<ChatContact[]>;
  messages(contactId: string): Promise<ChatMessage[]>;
  send(contactId: string, text: string): Promise<ChatMessage>;
}
export interface AnnouncementsRepository {
  list(): Promise<Announcement[]>;
  create(input: NewAnnouncementInput): Promise<Announcement>;
}
export interface CalendarRepository {
  list(): Promise<CalendarEvent[]>;
}
export interface LibraryRepository {
  list(): Promise<LibraryBook[]>;
}
export interface PayrollRepository {
  list(): Promise<PayslipEntry[]>;
}
export interface LeaveRepository {
  list(): Promise<LeaveRequest[]>;
  create(input: NewLeaveInput): Promise<LeaveRequest>;
}
export interface ApprovalsRepository {
  list(): Promise<ApprovalRequest[]>;
  decide(id: string, decision: 'approved' | 'rejected', note?: string): Promise<ApprovalRequest>;
}
export interface DashboardRepository {
  stats(): Promise<DashboardStats>;
}
export interface PrincipalRepository {
  overview(): Promise<PrincipalOverview>;
  attendance(): Promise<SchoolAttendance>;
}
export interface BusRepository {
  assignedBus(): Promise<Bus>;
  position(busId: string): Promise<BusPosition>;
  roster(busId: string): Promise<BoardingRecord[]>;
  saveBoarding(busId: string, records: BoardingRecord[]): Promise<void>;
}

export interface Repositories {
  auth: AuthRepository;
  classes: ClassesRepository;
  students: StudentsRepository;
  attendance: AttendanceRepository;
  timetable: TimetableRepository;
  exams: ExamsRepository;
  grades: GradesRepository;
  assignments: AssignmentsRepository;
  chat: ChatRepository;
  announcements: AnnouncementsRepository;
  calendar: CalendarRepository;
  library: LibraryRepository;
  payroll: PayrollRepository;
  leave: LeaveRepository;
  approvals: ApprovalsRepository;
  dashboard: DashboardRepository;
  principal: PrincipalRepository;
  bus: BusRepository;
  myAttendance: MyAttendanceRepository;
}
