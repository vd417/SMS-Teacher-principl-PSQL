import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { ScreenHeader } from '../../components';

// Each item navigates either by pushing a screen onto the Principal Home stack
// (`stack`) or by jumping to a sibling tab (`tab`, with an optional nested
// `screen`). Tab-overlapping features jump instead of registering a duplicate.
type MoreTarget = { stack: string } | { tab: string; screen?: string };

type MoreItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  soft: string;
  target: MoreTarget;
};

const MORE_ITEMS: readonly MoreItem[] = [
  {
    icon: 'megaphone-outline',
    label: 'Broadcast',
    color: Colors.pink,
    soft: Colors.pinkSoft,
    target: { stack: 'AnnouncementsScreen' },
  },
  {
    icon: 'bus-outline',
    label: 'Live Bus',
    color: Colors.blue,
    soft: Colors.blueSoft,
    target: { stack: 'BusScreen' },
  },
  {
    icon: 'people-outline',
    label: 'Teachers',
    color: Colors.teal,
    soft: Colors.tealSoft,
    target: { stack: 'TeacherDirectoryScreen' },
  },
  {
    icon: 'checkmark-done-outline',
    label: 'Approvals',
    color: Colors.coral,
    soft: Colors.coralSoft,
    target: { tab: 'Approvals' },
  },
  {
    icon: 'clipboard-outline',
    label: 'Staff Attendance',
    color: Colors.present,
    soft: Colors.presentSoft,
    target: { tab: 'PAttendance' },
  },
  {
    icon: 'calendar-outline',
    label: 'School Timetable',
    color: Colors.primary,
    soft: Colors.primarySoft,
    target: { tab: 'PTimetable' },
  },
  {
    icon: 'location-outline',
    label: 'My Check-in',
    color: Colors.present,
    soft: Colors.presentSoft,
    target: { tab: 'PProfile', screen: 'MyAttendanceScreen' },
  },
  {
    icon: 'settings-outline',
    label: 'Settings',
    color: Colors.inkMuted,
    soft: Colors.paper2,
    target: { tab: 'PProfile', screen: 'SettingsScreen' },
  },
  {
    icon: 'document-text-outline',
    label: 'Payslip',
    color: Colors.present,
    soft: Colors.presentSoft,
    target: { stack: 'PayslipScreen' },
  },
  {
    icon: 'calendar-outline',
    label: 'Leave',
    color: Colors.coral,
    soft: Colors.coralSoft,
    target: { stack: 'LeaveScreen' },
  },
  {
    icon: 'library-outline',
    label: 'Library',
    color: Colors.blue,
    soft: Colors.blueSoft,
    target: { stack: 'LibraryScreen' },
  },
] as const;

export const PrincipalMoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const go = (target: MoreTarget) => {
    if ('stack' in target) {
      // Same Principal Home stack — push directly.
      navigation.navigate(target.stack);
    } else if (target.screen) {
      // Sibling tab + nested screen (matches the teacher cross-tab pattern).
      navigation.navigate(target.tab, { screen: target.screen });
    } else {
      // Sibling tab, default (initial) screen.
      navigation.navigate(target.tab);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="More" subtitle="All features" showBack />
      </Animated.View>

      <View style={styles.grid}>
        {MORE_ITEMS.map((item, i) => (
          <Animated.View
            key={item.label}
            entering={FadeInDown.delay(100 + i * 40).springify()}
            style={styles.gridItem}
          >
            <TouchableOpacity
              style={[styles.card, { backgroundColor: item.soft }]}
              onPress={() => go(item.target)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={22} color={Colors.white} />
              </View>
              <Text style={[styles.cardLabel, { color: item.color }]}>{item.label}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  gridItem: { width: '47%' },
  card: {
    borderRadius: Radii.xl,
    padding: 18,
    alignItems: 'center',
    gap: 12,
    ...Shadows.card,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    textAlign: 'center',
  },
});
