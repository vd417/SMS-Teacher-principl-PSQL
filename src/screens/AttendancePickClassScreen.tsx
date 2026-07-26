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
import { useSectionAttendanceSummaries } from '@/features/attendance/hooks';
import { aggregateSections } from '@/features/attendance/gradeSummary';
import { deriveColorSet } from '@/theme/derive';
import { todayISO, formatLongDate } from '@/lib/date';
import { gradeLabel } from '@/lib/classLabel';
import type { HomeStackParamList } from '../navigation/types';

type AttPickNav = NativeStackNavigationProp<HomeStackParamList, 'AttendancePickClass'>;

type GradeGroup = { name: string; sections: SectionOption[] };

export const AttendancePickClassScreen: React.FC = () => {
  const navigation = useNavigation<AttPickNav>();
  const insets = useSafeAreaInsets();

  const today = todayISO();
  const { data: classes = [], isLoading, isError } = useClasses();
  const { bySection, isLoading: summariesLoading } = useSectionAttendanceSummaries(
    classes.map((c) => c.id),
    today
  );
  const [pickerGradeName, setPickerGradeName] = useState<string | null>(null);

  // Group classes by grade name so the user picks a class, then a section.
  // Section subtitles use the real fetched roster count, not the backend's
  // Class.studentCount field (confirmed stubbed to always return 0).
  const grades = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, SectionOption[]>();
    for (const c of classes) {
      const arr = map.get(c.name) ?? [];
      const total = bySection[c.id]?.total;
      arr.push({
        id: c.id,
        section: c.section,
        subtitle: total !== undefined ? `${total} student${total === 1 ? '' : 's'}` : undefined,
      });
      map.set(c.name, arr);
    }
    return [...map.entries()].map(([name, sections]) => ({ name, sections }));
  }, [classes, bySection]);

  // Derived (not stored) so the modal's subtitle counts stay live if bySection
  // resolves while the picker is already open.
  const picker = grades.find((g) => g.name === pickerGradeName) ?? null;

  const openAttendance = (classId: string) => {
    setPickerGradeName(null);
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
        <Text style={styles.dateText}>{formatLongDate(today)}</Text>
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
              onPress={() => setPickerGradeName(g.name)}
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
                {(() => {
                  const summary = aggregateSections(
                    g.sections.map((s) => bySection[s.id] ?? { total: 0, present: 0 })
                  );
                  if (summariesLoading) return <Text style={styles.gradeSummary}>…</Text>;
                  if (summary.total === 0) return <Text style={styles.gradeSummary}>No students</Text>;
                  return (
                    <Text style={styles.gradeSummary}>
                      Present {summary.present}/{summary.total} · {summary.pct}%
                    </Text>
                  );
                })()}
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
        onClose={() => setPickerGradeName(null)}
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
  gradeSummary: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
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
