// ─── Teacher ────────────────────────────────────────────────────────────────
export interface Teacher {
  name: string;
  initials: string;
  title: string;
  school: string;
  employee: string;
  email: string;
  phone: string;
  classroom: string;
  joined: string;
}

// ─── Classes ─────────────────────────────────────────────────────────────────
export interface SchoolClass {
  id: string;
  name: string;
  section: string;
  subject: string;
  students: number;
  room: string;
  color: string;
  colorSoft: string;
  colorTint: string;
  nextPeriod?: string;
}

// ─── Students ────────────────────────────────────────────────────────────────
export type AttendanceStatus = 'P' | 'A' | 'L' | 'V';

export interface Student {
  id: string;
  name: string;
  roll: string;
  initials: string;
  classId: string;
  attendance: number; // percentage
  grade: string;
  parent: string;
  parentPhone: string;
}

export interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  date: string;
}

// ─── Timetable ───────────────────────────────────────────────────────────────
export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri';

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
  color: string;
  colorSoft: string;
}

// ─── Exams ───────────────────────────────────────────────────────────────────
export type ExamStatus = 'upcoming' | 'completed' | 'draft';

export interface Exam {
  id: string;
  title: string;
  classId: string;
  className: string;
  subject: string;
  date: string;
  time: string;
  duration: number; // minutes
  maxMarks: number;
  topics: string[];
  status: ExamStatus;
  color: string;
  colorSoft: string;
}

// ─── Grades ──────────────────────────────────────────────────────────────────
export interface GradeEntry {
  studentId: string;
  studentName: string;
  examId: string;
  marks: number;
  maxMarks: number;
  grade: string;
}

// ─── Assignments ─────────────────────────────────────────────────────────────
export type AssignmentStatus = 'active' | 'due_soon' | 'overdue' | 'closed';

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
  color: string;
  colorSoft: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatContact {
  id: string;
  name: string;
  role: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  avatarColor: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
}

// ─── Announcements ───────────────────────────────────────────────────────────
export type AnnouncementType = 'info' | 'warning' | 'event' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  from: string;
  type: AnnouncementType;
  pinned?: boolean;
}

// ─── Calendar ────────────────────────────────────────────────────────────────
export type EventType = 'exam' | 'holiday' | 'meeting' | 'event' | 'deadline';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  color: string;
  description?: string;
}

// ─── Library ─────────────────────────────────────────────────────────────────
export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  subject: string;
  issuedTo?: string;
  dueDate?: string;
  status: 'available' | 'issued' | 'overdue';
  color: string;
  colorSoft: string;
}

// ─── Payslip ─────────────────────────────────────────────────────────────────
export interface PayslipEntry {
  month: string;
  year: number;
  gross: number;
  deductions: number;
  net: number;
  status: 'paid' | 'pending';
}

// ─── Leave ───────────────────────────────────────────────────────────────────
export type LeaveType = 'casual' | 'sick' | 'emergency' | 'other';
export type LeaveStatus = 'approved' | 'pending' | 'rejected';

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

// ─── Forms ───────────────────────────────────────────────────────────────────
export interface ExamFormData {
  title: string;
  classId: string;
  date: string;
  time: string;
  duration: number;
  maxMarks: number;
  topics: string[];
  notifyStudents: boolean;
  notifyParents: boolean;
  addToCalendar: boolean;
}

export interface LeaveFormData {
  type: LeaveType;
  from: string;
  to: string;
  reason: string;
  substitute?: string;
}

export interface ChatMessageFormData {
  message: string;
}
