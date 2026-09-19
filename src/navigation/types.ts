import type { NavigatorScreenParams } from '@react-navigation/native';
import type {
  ClassSectionPickClassParams,
  ClassSectionPickSectionParams,
} from './classSectionFlow';

// Main tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Timetable: undefined;
  Classes: undefined;
  Inbox: undefined;
  Profile: undefined;
};

// Shared academics list filters (principal school-wide views)
export type AcademicsListParams = {
  classId?: string;
  teacherId?: string;
  teacherName?: string;
};

// Home stack params
export type HomeStackParamList = {
  HomeScreen: undefined;
  AttendancePickClass: ClassSectionPickClassParams | undefined;
  AttendancePickSection: ClassSectionPickSectionParams;
  AttendanceScreen: { classId: string };
  MarksPickClass: ClassSectionPickClassParams | undefined;
  MarksPickExam: { classId: string };
  MarksEntryScreen: { examId: string };
  StudentScreen: { studentId: string; classId: string };
  ExamsScreen: AcademicsListParams | undefined;
  ExamDetail: { examId: string };
  ExamNew: undefined;
  GradesScreen: undefined;
  AssignmentsScreen: AcademicsListParams | undefined;
  AssignmentNewScreen: { assignmentId?: string } | undefined;
  AnnouncementsScreen: undefined;
  MoreScreen: undefined;
  BusScreen: undefined;
  LibraryScreen: undefined;
  PayslipScreen: undefined;
  LeaveScreen: undefined;
  ChatScreen: undefined;
  ChatThreadScreen: { contactId: string };
  StaffDirectoryScreen: undefined;
};

// Classes stack params
export type ClassesStackParamList = {
  ClassHubScreen: undefined;
  ClassDetailScreen: { classId: string };
  StudentScreen: { studentId: string; classId: string };
  AttendanceScreen: { classId: string };
  MarksPickExam: { classId: string };
  MarksEntryScreen: { examId: string };
  ClassTimetableScreen: { classId: string };
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
  SwitchSchool: undefined;
};

// Principal tab navigator params
export type PrincipalTabParamList = {
  PHome: NavigatorScreenParams<PrincipalHomeStackParamList>;
  PClasses: NavigatorScreenParams<PrincipalClassesStackParamList>;
  Approvals: undefined;
  PInbox: NavigatorScreenParams<InboxStackParamList>;
  PProfile: NavigatorScreenParams<ProfileStackParamList>;
};

// Principal Home stack params
export type PrincipalHomeStackParamList = {
  PrincipalHomeScreen: undefined;
  PrincipalMoreScreen: undefined;
  PrincipalAttendanceScreen: undefined;
  StaffAttendanceScreen: undefined;
  AttendancePickSection: ClassSectionPickSectionParams;
  AttendanceScreen: { classId: string };
  AnnouncementsScreen: undefined;
  BusScreen: undefined;
  TeacherDirectoryScreen: undefined;
  TeacherAcademicsScreen: { teacherId: string; teacherName: string };
  AssignmentsScreen: AcademicsListParams | undefined;
  AssignmentNewScreen: { assignmentId?: string } | undefined;
  ExamsScreen: AcademicsListParams | undefined;
  ExamNew: undefined;
  MarksEntryScreen: { examId: string };
  PayslipScreen: undefined;
  LeaveScreen: undefined;
  LibraryScreen: undefined;
  MyAttendanceScreen: undefined;
  PrincipalTransportScreen: undefined;
  StaffAttendanceHistoryScreen: { personId: string; name: string };
};

// Shared class→section pick flow (attendance, marks, timetable stacks)
export type ClassSectionStackParamList = {
  AttendancePickSection: ClassSectionPickSectionParams;
};

// Shared attendance pick-section flow (teacher Home stack + principal Attendance stack)
export type AttendanceSectionStackParamList = ClassSectionStackParamList & {
  AttendanceScreen: { classId: string };
};

// Principal Attendance stack params
export type PrincipalAttendanceStackParamList = {
  PrincipalAttendanceScreen: undefined;
} & AttendanceSectionStackParamList;

// Principal class hub stack (Classes tab)
export type PrincipalClassesStackParamList = {
  ClassHubScreen: undefined;
  AssignmentsScreen: AcademicsListParams | undefined;
  AssignmentNewScreen: { assignmentId?: string } | undefined;
  ExamsScreen: AcademicsListParams | undefined;
  ExamNew: undefined;
} & ClassSectionStackParamList & {
    ClassTimetableScreen: { classId: string };
    AttendanceScreen: { classId: string };
    MarksPickExam: { classId: string };
    MarksEntryScreen: { examId: string };
    StudentScreen: { studentId: string; classId: string };
  };

/** @deprecated Use PrincipalClassesStackParamList */
export type PrincipalTimetableStackParamList = PrincipalClassesStackParamList;

// Root navigator
export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: { mode?: 'reset' | 'create' } | undefined;
  SetPassword: undefined;
  SchoolPicker: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  Principal: NavigatorScreenParams<PrincipalTabParamList>;
};
