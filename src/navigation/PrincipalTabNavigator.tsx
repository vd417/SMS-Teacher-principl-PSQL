import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TabBar } from '../components';
import { PrincipalHomeScreen } from '../screens/principal/PrincipalHomeScreen';
import { ApprovalsScreen } from '../screens/principal/ApprovalsScreen';
import { TeacherDirectoryScreen } from '../screens/principal/TeacherDirectoryScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { BusScreen } from '../screens/BusScreen';
import { PrincipalAttendanceScreen } from '../screens/principal/PrincipalAttendanceScreen';
import { SchoolTimetableScreen } from '../screens/principal/SchoolTimetableScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { ChatThreadScreen } from '../screens/ChatThreadScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { MyAttendanceScreen } from '../screens/MyAttendanceScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type {
  PrincipalTabParamList,
  PrincipalHomeStackParamList,
  InboxStackParamList,
  ProfileStackParamList,
} from './types';

const Tab = createBottomTabNavigator<PrincipalTabParamList>();

const HomeStack = createStackNavigator<PrincipalHomeStackParamList>();
const PrincipalHomeStackNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="PrincipalHomeScreen" component={PrincipalHomeScreen} />
    <HomeStack.Screen name="AnnouncementsScreen" component={AnnouncementsScreen} />
    <HomeStack.Screen name="BusScreen" component={BusScreen} />
    <HomeStack.Screen name="TeacherDirectoryScreen" component={TeacherDirectoryScreen} />
  </HomeStack.Navigator>
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
    <Tab.Screen name="PAttendance" component={PrincipalAttendanceScreen} />
    <Tab.Screen name="PTimetable" component={SchoolTimetableScreen} />
    <Tab.Screen name="PInbox" component={InboxStackNavigator} />
    <Tab.Screen name="PProfile" component={ProfileStackNavigator} />
  </Tab.Navigator>
);
