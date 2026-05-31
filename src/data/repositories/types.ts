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
} from '@/data/domain';

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
export interface NewLeaveInput {
  type: LeaveRequest['type'];
  from: string;
  to: string;
  reason: string;
  substitute?: string;
}
export interface GradeInput {
  studentId: string;
  examId: string;
  marks: number;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  me(): Promise<User>;
  logout(): Promise<void>;
}
export interface ClassesRepository {
  list(): Promise<Class[]>;
  get(id: string): Promise<Class>;
}
export interface StudentsRepository {
  listByClass(classId: string): Promise<Student[]>;
  get(id: string): Promise<Student>;
}
export interface AttendanceRepository {
  forClass(classId: string, date: string): Promise<AttendanceRecord[]>;
  save(classId: string, date: string, records: AttendanceRecord[]): Promise<void>;
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
}
export interface ChatRepository {
  contacts(): Promise<ChatContact[]>;
  messages(contactId: string): Promise<ChatMessage[]>;
  send(contactId: string, text: string): Promise<ChatMessage>;
}
export interface AnnouncementsRepository {
  list(): Promise<Announcement[]>;
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
export interface DashboardRepository {
  stats(): Promise<DashboardStats>;
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
  dashboard: DashboardRepository;
}
