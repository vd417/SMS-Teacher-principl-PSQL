import type { NavigatorScreenParams } from '@react-navigation/native';

// Main tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Calendar: undefined;
  Classes: undefined;
  Inbox: undefined;
  Profile: undefined;
};

// Home stack params
export type HomeStackParamList = {
  HomeScreen: undefined;
  AttendancePickClass: undefined;
  AttendanceScreen: { classId: string };
  StudentScreen: { studentId: string };
  ExamsScreen: undefined;
  ExamDetail: { examId: string };
  ExamNew: undefined;
  GradesScreen: undefined;
  AssignmentsScreen: undefined;
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

// Calendar stack params
export type CalendarStackParamList = {
  CalendarScreen: undefined;
  ScheduleScreen: undefined;
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
  AnnouncementsScreen: undefined;
  BusScreen: undefined;
  TeacherDirectoryScreen: undefined;
};

// Root navigator
export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
