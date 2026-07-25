import type { NavigatorScreenParams } from '@react-navigation/native';

// Main tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Timetable: undefined;
  Classes: undefined;
  Inbox: undefined;
  Profile: undefined;
};

// Home stack params
export type HomeStackParamList = {
  HomeScreen: undefined;
  AttendancePickClass: undefined;
  AttendanceScreen: { classId: string };
  MarksPickClass: undefined;
  MarksEntryScreen: { examId: string };
  StudentScreen: { studentId: string };
  ExamsScreen: undefined;
  ExamDetail: { examId: string };
  ExamNew: undefined;
  GradesScreen: undefined;
  AssignmentsScreen: undefined;
  AssignmentNewScreen: undefined;
  AnnouncementsScreen: undefined;
  MoreScreen: undefined;
  BusScreen: undefined;
  LibraryScreen: undefined;
  PayslipScreen: undefined;
  LeaveScreen: undefined;
};

// Classes stack params
export type ClassesStackParamList = {
  ClassesScreen: undefined;
  ClassDetailScreen: { classId: string };
  StudentScreen: { studentId: string };
  AttendanceScreen: { classId: string };
};

// Inbox stack params
export type InboxStackParamList = {
  ChatScreen: undefined;
  ChatThreadScreen: { contactId: string };
};

// Profile stack params
export type ProfileStackParamList = {
  ProfileScreen: undefined;
  MyAttendanceScreen: undefined;
  SettingsScreen: undefined;
  ChangePasswordScreen: undefined;
  PayslipScreen: undefined;
  LeaveScreen: undefined;
};

// Principal tab navigator params
export type PrincipalTabParamList = {
  PHome: undefined;
  Approvals: undefined;
  PAttendance: undefined;
  PTimetable: undefined;
  PInbox: undefined;
  PProfile: undefined;
};

// Principal Home stack params
export type PrincipalHomeStackParamList = {
  PrincipalHomeScreen: undefined;
  PrincipalMoreScreen: undefined;
  AnnouncementsScreen: undefined;
  BusScreen: undefined;
  TeacherDirectoryScreen: undefined;
  PayslipScreen: undefined;
  LeaveScreen: undefined;
  LibraryScreen: undefined;
};

// Principal Attendance stack params
export type PrincipalAttendanceStackParamList = {
  PrincipalAttendanceScreen: undefined;
  AttendanceScreen: { classId: string };
};

// Principal Timetable stack params
export type PrincipalTimetableStackParamList = {
  SchoolTimetableScreen: undefined;
  ClassTimetableScreen: { classId: string };
};

// Root navigator
export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: { mode?: 'reset' | 'create' } | undefined;
  SetPassword: undefined;
  SchoolPicker: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
