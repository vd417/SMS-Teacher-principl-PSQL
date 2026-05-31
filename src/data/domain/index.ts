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
export type Role = 'teacher';

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
