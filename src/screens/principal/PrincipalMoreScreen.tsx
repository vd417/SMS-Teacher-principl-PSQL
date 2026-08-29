import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { ScreenHeader } from '../../components';
import { useFeature } from '@/features/plan/hooks';

// Each item navigates either by pushing a screen onto the Principal Home stack
// (`stack`) or by jumping to a sibling tab (`tab`, with an optional nested
// `screen`). Tab-overlapping features jump instead of registering a duplicate.
type MoreTarget = { stack: string } | { tab: string; screen?: string };

type MoreItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  soft: string;
  feature?: string;
  target: MoreTarget;
};

const MORE_ITEMS: readonly MoreItem[] = [
  {
    icon: 'megaphone-outline',
    label: 'Broadcast',
    feature: 'communication',
    color: Colors.pink,
    soft: Colors.pinkSoft,
    target: { stack: 'AnnouncementsScreen' },
  },
  {
    icon: 'chatbubbles-outline',
    label: 'Chat',
    feature: 'communication',
    color: Colors.teal,
    soft: Colors.tealSoft,
    target: { tab: 'PInbox' },
  },
  {
    icon: 'bus-outline',
    label: 'Live Bus',
    feature: 'transport',
    color: Colors.blue,
    soft: Colors.blueSoft,
    target: { stack: 'PrincipalTransportScreen' },
  },
  {
    icon: 'people-outline',
    label: 'Teachers',
    feature: 'sis',
    color: Colors.teal,
    soft: Colors.tealSoft,
    target: { stack: 'TeacherDirectoryScreen' },
  },
  {
    icon: 'checkmark-done-outline',
    label: 'Approvals',
    feature: 'operations',
    color: Colors.coral,
    soft: Colors.coralSoft,
    target: { tab: 'Approvals' },
  },
  {
    icon: 'clipboard-outline',
    label: 'Staff Attendance',
    feature: 'attendance',
    color: Colors.present,
    soft: Colors.presentSoft,
    target: { stack: 'PrincipalAttendanceScreen' },
  },
  {
    icon: 'school-outline',
    label: 'Classes',
    feature: 'academics',
    color: Colors.primary,
    soft: Colors.primarySoft,
    target: { tab: 'PClasses' },
  },
  {
    icon: 'book-outline',
    label: 'Homework',
    feature: 'academics',
    color: Colors.orange,
    soft: Colors.lateSoft,
    target: { stack: 'AssignmentsScreen' },
  },
  {
    icon: 'document-text-outline',
    label: 'Tests & Exams',
    feature: 'academics',
    color: Colors.coral,
    soft: Colors.coralSoft,
    target: { stack: 'ExamsScreen' },
  },
  {
    icon: 'location-outline',
    label: 'My Attendance',
    color: Colors.present,
    soft: Colors.presentSoft,
    target: { stack: 'MyAttendanceScreen' },
  },
  {
    icon: 'settings-outline',
    label: 'Settings',
    feature: 'operations',
    color: Colors.inkMuted,
    soft: Colors.paper2,
    target: { tab: 'PProfile', screen: 'SettingsScreen' },
  },
  {
    icon: 'document-text-outline',
    label: 'Payslip',
    feature: 'hr_payroll',
    color: Colors.present,
    soft: Colors.presentSoft,
    target: { stack: 'PayslipScreen' },
  },
  {
    icon: 'calendar-outline',
    label: 'Leave',
    feature: 'operations',
    color: Colors.coral,
    soft: Colors.coralSoft,
    target: { stack: 'LeaveScreen' },
  },
  {
    icon: 'library-outline',
    label: 'Library',
    feature: 'library',
    color: Colors.blue,
    soft: Colors.blueSoft,
    target: { stack: 'LibraryScreen' },
  },
] as const;

function PrincipalMoreGridItem({
  item,
  index,
  onPress,
}: {
  item: MoreItem;
  index: number;
  onPress: () => void;
}) {
  // useFeature must run unconditionally (rules-of-hooks) — an unrecognized feature
  // key defaults to the lowest tier requirement, which every plan satisfies, so this
  // is equivalent to "always allowed" for rows with no feature restriction.
  const { allowed } = useFeature(item.feature ?? 'none');

  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 40).springify()}
      style={styles.gridItem}
    >
      <TouchableOpacity
        style={[styles.card, { backgroundColor: item.soft }, !allowed && styles.cardLocked]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {!allowed && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={11} color={Colors.inkMuted} />
          </View>
        )}
        <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={22} color={Colors.white} />
        </View>
        <Text style={[styles.cardLabel, { color: item.color }]}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const PrincipalMoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const go = (target: MoreTarget) => {
    if ('stack' in target) {
      navigation.navigate(target.stack);
      return;
    }
    const tabNav = navigation.getParent();
    if (!tabNav) return;
    if (target.screen) {
      tabNav.navigate(target.tab, { screen: target.screen });
    } else {
      tabNav.navigate(target.tab);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="More" subtitle="All features" showBack showMoreFeatures={false} />
      </Animated.View>

      <View style={styles.grid}>
        {MORE_ITEMS.map((item, i) => (
          <PrincipalMoreGridItem
            key={item.label}
            item={item}
            index={i}
            onPress={() => go(item.target)}
          />
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
  cardLocked: { opacity: 0.72 },
  lockBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: Colors.card,
    borderRadius: Radii.full,
    padding: 4,
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
