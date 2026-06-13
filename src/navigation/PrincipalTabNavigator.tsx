import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TabBar } from '../components';
import { PrincipalHomeScreen } from '../screens/principal/PrincipalHomeScreen';
import { PrincipalMoreScreen } from '../screens/principal/PrincipalMoreScreen';
import { ApprovalsScreen } from '../screens/principal/ApprovalsScreen';
import { TeacherDirectoryScreen } from '../screens/principal/TeacherDirectoryScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { BusScreen } from '../screens/BusScreen';
import { PrincipalAttendanceScreen } from '../screens/principal/PrincipalAttendanceScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { SchoolTimetableScreen } from '../screens/principal/SchoolTimetableScreen';
import { ClassTimetableScreen } from '../screens/principal/ClassTimetableScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyAttendanceScreen } from '../screens/MyAttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PayslipScreen } from '../screens/PayslipScreen';
import { LeaveScreen } from '../screens/LeaveScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import type {
  PrincipalTabParamList,
  PrincipalHomeStackParamList,
  PrincipalAttendanceStackParamList,
  PrincipalTimetableStackParamList,
  InboxStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<PrincipalTabParamList>();

const HomeStack = createStackNavigator<PrincipalHomeStackParamList>();
const PrincipalHomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="PrincipalHomeScreen" component={PrincipalHomeScreen} />
    <HomeStack.Screen name="PrincipalMoreScreen" component={PrincipalMoreScreen} />
    <HomeStack.Screen name="AnnouncementsScreen" component={AnnouncementsScreen} />
    <HomeStack.Screen name="BusScreen" component={BusScreen} />
    <HomeStack.Screen name="TeacherDirectoryScreen" component={TeacherDirectoryScreen} />
    <HomeStack.Screen name="PayslipScreen" component={PayslipScreen} />
    <HomeStack.Screen name="LeaveScreen" component={LeaveScreen} />
    <HomeStack.Screen name="LibraryScreen" component={LibraryScreen} />
  </HomeStack.Navigator>
);

const AttendanceStack = createStackNavigator<PrincipalAttendanceStackParamList>();
const PrincipalAttendanceStackNavigator = () => (
  <AttendanceStack.Navigator screenOptions={{ headerShown: false }}>
    <AttendanceStack.Screen
      name="PrincipalAttendanceScreen"
      component={PrincipalAttendanceScreen}
    />
    <AttendanceStack.Screen name="AttendanceScreen" component={AttendanceScreen} />
  </AttendanceStack.Navigator>
);

const TimetableStack = createStackNavigator<PrincipalTimetableStackParamList>();
const PrincipalTimetableStackNavigator = () => (
  <TimetableStack.Navigator screenOptions={{ headerShown: false }}>
    <TimetableStack.Screen name="SchoolTimetableScreen" component={SchoolTimetableScreen} />
    <TimetableStack.Screen name="ClassTimetableScreen" component={ClassTimetableScreen} />
  </TimetableStack.Navigator>
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
    <ProfileStack.Screen name="MyAttendanceScreen" component={MyAttendanceScreen} />
    <ProfileStack.Screen name="SettingsScreen" component={SettingsScreen} />
  </ProfileStack.Navigator>
);

export const PrincipalTabNavigator = () => (
  <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
    <Tab.Screen name="PHome" component={PrincipalHomeStackNavigator} />
    <Tab.Screen name="Approvals" component={ApprovalsScreen} />
    <Tab.Screen name="PAttendance" component={PrincipalAttendanceStackNavigator} />
    <Tab.Screen name="PTimetable" component={PrincipalTimetableStackNavigator} />
    <Tab.Screen name="PInbox" component={InboxStackNavigator} />
    <Tab.Screen name="PProfile" component={ProfileStackNavigator} />
  </Tab.Navigator>
);
