import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TabBar } from '../components';
import { HomeScreen } from '../screens/HomeScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { ClassesScreen } from '../screens/ClassesScreen';
import { ClassDetailScreen } from '../screens/ClassDetailScreen';
import { StudentScreen } from '../screens/StudentScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyAttendanceScreen } from '../screens/MyAttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PayslipScreen } from '../screens/PayslipScreen';
import { LeaveScreen } from '../screens/LeaveScreen';
import { AttendancePickClassScreen } from '../screens/AttendancePickClassScreen';
import { ExamsScreen } from '../screens/ExamsScreen';
import { ExamDetailScreen } from '../screens/ExamDetailScreen';
import { ExamNewScreen } from '../screens/ExamNewScreen';
import { GradesScreen } from '../screens/GradesScreen';
import { AssignmentsScreen } from '../screens/AssignmentsScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { BusScreen } from '../screens/BusScreen';
import type {
  MainTabParamList,
  HomeStackParamList,
  ClassesStackParamList,
  CalendarStackParamList,
  InboxStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Home Stack ────────────────────────────────────────────────────────────
const HomeStack = createStackNavigator<HomeStackParamList>();
const HomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeScreen" component={HomeScreen} />
    <HomeStack.Screen name="AttendancePickClass" component={AttendancePickClassScreen} />
    <HomeStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
    <HomeStack.Screen name="StudentScreen" component={StudentScreen} />
    <HomeStack.Screen name="ExamsScreen" component={ExamsScreen} />
    <HomeStack.Screen name="ExamDetail" component={ExamDetailScreen} />
    <HomeStack.Screen name="ExamNew" component={ExamNewScreen} />
    <HomeStack.Screen name="GradesScreen" component={GradesScreen} />
    <HomeStack.Screen name="AssignmentsScreen" component={AssignmentsScreen} />
    <HomeStack.Screen name="AnnouncementsScreen" component={AnnouncementsScreen} />
    <HomeStack.Screen name="MoreScreen" component={MoreScreen} />
    <HomeStack.Screen name="BusScreen" component={BusScreen} />
    <HomeStack.Screen name="LibraryScreen" component={LibraryScreen} />
    <HomeStack.Screen name="PayslipScreen" component={PayslipScreen} />
    <HomeStack.Screen name="LeaveScreen" component={LeaveScreen} />
  </HomeStack.Navigator>
);

// ─── Calendar Stack ────────────────────────────────────────────────────────
const CalendarStack = createStackNavigator<CalendarStackParamList>();
const CalendarStackNavigator = () => (
  <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
    <CalendarStack.Screen name="CalendarScreen" component={CalendarScreen} />
    <CalendarStack.Screen name="ScheduleScreen" component={ScheduleScreen} />
  </CalendarStack.Navigator>
);

// ─── Classes Stack ─────────────────────────────────────────────────────────
const ClassesStack = createStackNavigator<ClassesStackParamList>();
const ClassesStackNavigator = () => (
  <ClassesStack.Navigator screenOptions={{ headerShown: false }}>
    <ClassesStack.Screen name="ClassesScreen" component={ClassesScreen} />
    <ClassesStack.Screen name="ClassDetailScreen" component={ClassDetailScreen} />
    <ClassesStack.Screen name="StudentScreen" component={StudentScreen} />
    <ClassesStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
  </ClassesStack.Navigator>
);

// ─── Inbox Stack ───────────────────────────────────────────────────────────
const InboxStack = createStackNavigator<InboxStackParamList>();
const InboxStackNavigator = () => (
  <InboxStack.Navigator screenOptions={{ headerShown: false }}>
    <InboxStack.Screen name="ChatScreen" component={ChatScreen} />
    <InboxStack.Screen name="ChatThreadScreen" component={ChatThreadScreen} />
  </InboxStack.Navigator>
);

// ─── Profile Stack ─────────────────────────────────────────────────────────
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const ProfileStackNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileScreen" component={ProfileScreen} />
    <ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
    <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />
    <ProfileStack.Screen name="PayslipScreen" component={PayslipScreen} />
    <ProfileStack.Screen name="LeaveScreen" component={LeaveScreen} />
  </ProfileStack.Navigator>
);

// ─── Main Tab ──────────────────────────────────────────────────────────────
export const MainTabNavigator = () => (
  <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="Home" component={HomeStackNavigator} />
    <Tab.Screen name="Calendar" component={CalendarStackNavigator} />
    <Tab.Screen name="Classes" component={ClassesStackNavigator} />
    <Tab.Screen name="Inbox" component={InboxStackNavigator} />
    <Tab.Screen name="Profile" component={ProfileStackNavigator} />
  </Tab.Navigator>
);
