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
import type { HomeStackParamList } from '../navigation/types';

type MoreNav = NativeStackNavigationProp<HomeStackParamList, 'MoreScreen'>;

const MORE_ITEMS = [
  {
    icon: 'library-outline',
    label: 'Library',
    screen: 'LibraryScreen',
    color: Colors.blue,
    soft: Colors.blueSoft,
  },
  {
    icon: 'document-text-outline',
    label: 'Payslip',
    screen: 'PayslipScreen',
    color: Colors.present,
    soft: Colors.presentSoft,
  },
  {
    icon: 'calendar-outline',
    label: 'Leave',
    screen: 'LeaveScreen',
    color: Colors.coral,
    soft: Colors.coralSoft,
  },
  {
    icon: 'megaphone-outline',
    label: 'Announcements',
    screen: 'AnnouncementsScreen',
    color: Colors.pink,
    soft: Colors.pinkSoft,
  },
  {
    icon: 'clipboard-outline',
    label: 'Assignments',
    screen: 'AssignmentsScreen',
    color: Colors.teal,
    soft: Colors.tealSoft,
  },
  {
    icon: 'ribbon-outline',
    label: 'Grades',
    screen: 'GradesScreen',
    color: Colors.primary,
    soft: Colors.primarySoft,
  },
  {
    icon: 'document-text-outline',
    label: 'Exams',
    screen: 'ExamsScreen',
    color: Colors.coral,
    soft: Colors.coralSoft,
  },
  {
    icon: 'people-outline',
    label: 'Attendance',
    screen: 'AttendancePickClass',
    color: Colors.present,
    soft: Colors.presentSoft,
  },
] as const;

export const MoreScreen: React.FC = () => {
  const navigation = useNavigation<MoreNav>();
  const insets = useSafeAreaInsets();

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
              onPress={() => navigation.navigate(item.screen as never)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as never} size={22} color={Colors.white} />
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
