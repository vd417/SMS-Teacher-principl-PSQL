import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useFeature } from '@/features/plan/hooks';
import type { HomeStackParamList } from '../navigation/types';
import type { ClassSectionPickClassParams } from '../navigation/classSectionFlow';

type MoreNav = NativeStackNavigationProp<HomeStackParamList, 'MoreScreen'>;

type MoreItem = {
  icon: string;
  label: string;
  color: string;
  soft: string;
  screen: keyof HomeStackParamList;
  feature: string;
  params?: ClassSectionPickClassParams;
};

const MORE_ITEMS: MoreItem[] = [
  {
    icon: 'library-outline',
    label: 'Library',
    screen: 'LibraryScreen',
    feature: 'library',
    color: Colors.blue,
    soft: Colors.blueSoft,
  },
  {
    icon: 'document-text-outline',
    label: 'Payslip',
    screen: 'PayslipScreen',
    feature: 'hr_payroll',
    color: Colors.present,
    soft: Colors.presentSoft,
  },
  {
    icon: 'calendar-outline',
    label: 'Leave',
    screen: 'LeaveScreen',
    feature: 'operations',
    color: Colors.coral,
    soft: Colors.coralSoft,
  },
  {
    icon: 'megaphone-outline',
    label: 'Announcements',
    screen: 'AnnouncementsScreen',
    feature: 'communication',
    color: Colors.pink,
    soft: Colors.pinkSoft,
  },
  {
    icon: 'chatbubbles-outline',
    label: 'Chat',
    screen: 'ChatScreen',
    feature: 'communication',
    color: Colors.teal,
    soft: Colors.tealSoft,
  },
  {
    icon: 'people-outline',
    label: 'Teachers',
    screen: 'StaffDirectoryScreen',
    feature: 'communication',
    color: Colors.blue,
    soft: Colors.blueSoft,
  },
  {
    icon: 'clipboard-outline',
    label: 'Homework',
    screen: 'AssignmentsScreen',
    feature: 'academics',
    color: Colors.teal,
    soft: Colors.tealSoft,
  },
  {
    icon: 'ribbon-outline',
    label: 'Grades',
    screen: 'GradesScreen',
    feature: 'exams',
    color: Colors.primary,
    soft: Colors.primarySoft,
  },
  {
    icon: 'document-text-outline',
    label: 'Tests & Exams',
    screen: 'ExamsScreen',
    feature: 'exams',
    color: Colors.coral,
    soft: Colors.coralSoft,
  },
  {
    icon: 'people-outline',
    label: 'Attendance',
    screen: 'AttendancePickClass',
    feature: 'attendance',
    params: { flow: 'attendance' },
    color: Colors.present,
    soft: Colors.presentSoft,
  },
  {
    icon: 'bus-outline',
    label: 'Bus Duty',
    screen: 'BusScreen',
    feature: 'transport',
    color: Colors.blue,
    soft: Colors.blueSoft,
  },
];

function MoreGridItem({
  item,
  index,
  onPress,
}: {
  item: MoreItem;
  index: number;
  onPress: () => void;
}) {
  const { allowed } = useFeature(item.feature);

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
          <Ionicons name={item.icon as never} size={22} color={Colors.white} />
        </View>
        <Text style={[styles.cardLabel, { color: item.color }]}>{item.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<MoreNav>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader
          title="More"
          subtitle={isPrincipal ? 'School features' : 'My classes & tools'}
          showBack
          showMoreFeatures={false}
        />
      </Animated.View>

      <View style={styles.grid}>
        {MORE_ITEMS.map((item, i) => (
          <MoreGridItem
            key={item.label}
            item={item}
            index={i}
            onPress={() =>
              item.params
                ? navigation.navigate(item.screen, item.params)
                : navigation.navigate(item.screen)
            }
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
