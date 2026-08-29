import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TabBar } from '../components';
import { PrincipalHomeScreen } from '../screens/principal/PrincipalHomeScreen';
import { PrincipalMoreScreen } from '../screens/principal/PrincipalMoreScreen';
import { ApprovalsScreen } from '../screens/principal/ApprovalsScreen';
import { AssignmentsScreen } from '../screens/AssignmentsScreen';
import { AssignmentNewScreen } from '../screens/AssignmentNewScreen';
import { ExamsScreen } from '../screens/ExamsScreen';
import { ExamNewScreen } from '../screens/ExamNewScreen';
import { TeacherDirectoryScreen } from '../screens/principal/TeacherDirectoryScreen';
import { TeacherAcademicsScreen } from '../screens/principal/TeacherAcademicsScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { BusScreen } from '../screens/BusScreen';
import { PrincipalTransportScreen } from '../screens/principal/PrincipalTransportScreen';
import { PrincipalAttendanceScreen } from '../screens/principal/PrincipalAttendanceScreen';
import { AttendancePickSectionScreen } from '../screens/AttendancePickSectionScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ClassHubScreen } from '../screens/ClassHubScreen';
import { ClassTimetableScreen } from '../screens/principal/ClassTimetableScreen';
import { MarksPickExamScreen } from '../screens/MarksPickExamScreen';
import { MarksEntryScreen } from '../screens/MarksEntryScreen';
import { StudentScreen } from '../screens/StudentScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyAttendanceScreen } from '../screens/MyAttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PayslipScreen } from '../screens/PayslipScreen';
import { LeaveScreen } from '../screens/LeaveScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { SchoolPickerScreen } from '../screens/SchoolPickerScreen';
import type {
  PrincipalTabParamList,
  PrincipalHomeStackParamList,
  PrincipalClassesStackParamList,
  InboxStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<PrincipalTabParamList>();

const HomeStack = createStackNavigator<PrincipalHomeStackParamList>();
const PrincipalHomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="PrincipalHomeScreen" component={PrincipalHomeScreen} />
    <HomeStack.Screen name="PrincipalMoreScreen" component={PrincipalMoreScreen} />
    <HomeStack.Screen name="PrincipalAttendanceScreen" component={PrincipalAttendanceScreen} />
    <HomeStack.Screen name="AttendancePickSection" component={AttendancePickSectionScreen} />
    <HomeStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
    <HomeStack.Screen name="AnnouncementsScreen" component={AnnouncementsScreen} />
    <HomeStack.Screen name="BusScreen" component={BusScreen} />
    <HomeStack.Screen name="PrincipalTransportScreen" component={PrincipalTransportScreen} />
    <HomeStack.Screen name="TeacherDirectoryScreen" component={TeacherDirectoryScreen} />
    <HomeStack.Screen name="TeacherAcademicsScreen" component={TeacherAcademicsScreen} />
    <HomeStack.Screen name="AssignmentsScreen" component={AssignmentsScreen} />
    <HomeStack.Screen name="AssignmentNewScreen" component={AssignmentNewScreen} />
    <HomeStack.Screen name="ExamsScreen" component={ExamsScreen} />
    <HomeStack.Screen name="ExamNew" component={ExamNewScreen} />
    <HomeStack.Screen name="MarksEntryScreen" component={MarksEntryScreen} />
    <HomeStack.Screen name="PayslipScreen" component={PayslipScreen} />
    <HomeStack.Screen name="LeaveScreen" component={LeaveScreen} />
    <HomeStack.Screen name="LibraryScreen" component={LibraryScreen} />
    <HomeStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
  </HomeStack.Navigator>
);

const ClassesStack = createStackNavigator<PrincipalClassesStackParamList>();
const PrincipalClassesStackNavigator = () => (
  <ClassesStack.Navigator screenOptions={{ headerShown: false }}>
    <ClassesStack.Screen name="ClassHubScreen" component={ClassHubScreen} />
    <ClassesStack.Screen name="AssignmentsScreen" component={AssignmentsScreen} />
    <ClassesStack.Screen name="AssignmentNewScreen" component={AssignmentNewScreen} />
    <ClassesStack.Screen name="ExamsScreen" component={ExamsScreen} />
    <ClassesStack.Screen name="ExamNew" component={ExamNewScreen} />
    <ClassesStack.Screen name="AttendancePickSection" component={AttendancePickSectionScreen} />
    <ClassesStack.Screen name="ClassTimetableScreen" component={ClassTimetableScreen} />
    <ClassesStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
    <ClassesStack.Screen name="MarksPickExam" component={MarksPickExamScreen} />
    <ClassesStack.Screen name="MarksEntryScreen" component={MarksEntryScreen} />
    <ClassesStack.Screen name="StudentScreen" component={StudentScreen} />
  </ClassesStack.Navigator>
);

const InboxStack = createStackNavigator<InboxStackParamList>();
const InboxStackNavigator = () => (
  <InboxStack.Navigator screenOptions={{ headerShown: false }}>
    <InboxStack.Screen name="ChatScreen" component={ChatScreen} />
    <InboxStack.Screen name="ChatThreadScreen" component={ChatThreadScreen} />
  </InboxStack.Navigator>
);

const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
    <ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
    <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />
    <ProfileStack.Screen name="SwitchSchool" component={SchoolPickerScreen} />
  </ProfileStack.Navigator>
);

export const PrincipalTabNavigator = () => (
  <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="PHome" component={PrincipalHomeStackNavigator} />
    <Tab.Screen name="PClasses" component={PrincipalClassesStackNavigator} />
    <Tab.Screen name="Approvals" component={ApprovalsScreen} />
    <Tab.Screen name="PInbox" component={InboxStackNavigator} />
    <Tab.Screen name="PProfile" component={ProfileStackNavigator} />
  </Tab.Navigator>
);
