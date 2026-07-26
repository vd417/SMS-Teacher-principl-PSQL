import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, SectionPickerModal } from '../components';
import type { SectionOption } from '../components';
import { useClasses } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
import { todayISO, formatLongDate } from '@/lib/date';
import { gradeLabel } from '@/lib/classLabel';
import type { HomeStackParamList } from '../navigation/types';

type AttPickNav = NativeStackNavigationProp<HomeStackParamList, 'AttendancePickClass'>;

type GradeGroup = { name: string; sections: SectionOption[] };

export const AttendancePickClassScreen: React.FC = () => {
  const navigation = useNavigation<AttPickNav>();
  const insets = useSafeAreaInsets();

  const { data: classes = [], isLoading, isError } = useClasses();
  const [picker, setPicker] = useState<GradeGroup | null>(null);

  // Group classes by grade name so the user picks a class, then a section.
  const grades = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, SectionOption[]>();
    for (const c of classes) {
      const arr = map.get(c.name) ?? [];
      arr.push({ id: c.id, section: c.section, subtitle: `${c.studentCount} students` });
      map.set(c.name, arr);
    }
    return [...map.entries()].map(([name, sections]) => ({ name, sections }));
  }, [classes]);

  const openAttendance = (classId: string) => {
    setPicker(null);
    navigation.navigate('AttendanceScreen', { classId });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Mark Attendance" subtitle="Select a class, then a section" showBack />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.dateCard}>
        <Ionicons name="calendar" size={18} color={Colors.primary} />
        <Text style={styles.dateText}>{formatLongDate(todayISO())}</Text>
      </Animated.View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load classes</Text>
        </View>
      )}

      {!isLoading && !isError && grades.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No classes found</Text>
        </View>
      )}

      {grades.map((g, i) => {
        const cs = deriveColorSet(g.name);
        return (
          <Animated.View key={g.name} entering={FadeInDown.delay(140 + i * 60).springify()}>
            <TouchableOpacity
              style={styles.gradeCard}
              onPress={() => setPicker(g)}
              activeOpacity={0.85}
            >
              <View style={[styles.gradeIcon, { backgroundColor: cs.color }]}>
                <Ionicons name="school" size={22} color={Colors.white} />
              </View>
              <View style={styles.gradeInfo}>
                <Text style={styles.gradeName}>{gradeLabel(g.name)}</Text>
                <Text style={styles.gradeMeta}>
                  {g.sections.length} section{g.sections.length > 1 ? 's' : ''} · tap to choose
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.inkSoft} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      <SectionPickerModal
        visible={!!picker}
        gradeName={picker ? gradeLabel(picker.name) : null}
        sections={picker?.sections ?? []}
        onSelect={openAttendance}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  gradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 16,
    ...Shadows.card,
  },
  gradeIcon: {
    width: 54,
    height: 54,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gradeInfo: {
    flex: 1,
  },
  gradeName: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.ink,
  },
  gradeMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 3,
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.absent,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
  },
});
