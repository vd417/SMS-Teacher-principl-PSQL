import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { SectionPickerModal, TeacherSubjectDrawer } from '../../components';
import type { SectionOption } from '../../components';
import { usePrincipalAttendance } from '@/features/principal/hooks';
import { useClasses } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
import { gradeLabel } from '@/lib/classLabel';
import type { PrincipalAttendanceStackParamList } from '../../navigation/types';

type PAttendanceNav = NativeStackNavigationProp<
  PrincipalAttendanceStackParamList,
  'PrincipalAttendanceScreen'
>;

type GradeGroup = {
  name: string;
  present: number;
  total: number;
  pct: number;
  options: SectionOption[];
};

export const PrincipalAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PAttendanceNav>();
  const { data, isLoading } = usePrincipalAttendance();
  const { data: classList = [] } = useClasses();

  const classById = useMemo(() => Object.fromEntries(classList.map((c) => [c.id, c])), [classList]);

  const [picker, setPicker] = useState<GradeGroup | null>(null);
  const [staffView, setStaffView] = useState<'teaching' | 'support' | null>(null);

  const allStaff = data?.staff ?? [];
  const teachingStaff = allStaff.filter((s) => !s.role);
  const supportStaff = allStaff.filter((s) => s.role);
  const presentCount = (list: typeof allStaff) => list.filter((s) => s.checkedIn).length;

  // Group the per-section attendance into grades so the principal picks a
  // class, then a section (via popup), before opening that section's attendance.
  const gradeGroups = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, GradeGroup>();
    for (const c of data?.classes ?? []) {
      const name = classById[c.classId]?.name ?? c.className;
      const g = map.get(name) ?? { name, present: 0, total: 0, pct: 0, options: [] };
      g.present += c.present;
      g.total += c.total;
      g.options.push({
        id: c.classId,
        section: classById[c.classId]?.section ?? '?',
        subtitle: `${c.pct}% present`,
      });
      map.set(name, g);
    }
    return [...map.values()].map((g) => ({
      ...g,
      pct: g.total ? Math.round((g.present / g.total) * 100) : 0,
    }));
  }, [data, classById]);

  const openAttendance = (classId: string) => {
    setPicker(null);
    navigation.navigate('AttendanceScreen', { classId });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Attendance</Text>
        <Text style={styles.sub}>{data?.date ?? 'Today'}</Text>

        {isLoading || !data ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* School total */}
            <Animated.View entering={FadeInDown.springify()} style={styles.totalCard}>
              <View>
                <Text style={styles.totalPct}>{data.overallPct}%</Text>
                <Text style={styles.totalLabel}>School present today</Text>
              </View>
              <View style={styles.totalRight}>
                <Text style={styles.totalCount}>
                  {data.presentTotal}/{data.studentTotal}
                </Text>
                <Text style={styles.totalLabel}>students</Text>
              </View>
            </Animated.View>

            {/* Students by class */}
            <Text style={styles.section}>Students by class</Text>
            <Text style={styles.sectionHint}>Select a class, then a section to view or edit</Text>
            {gradeGroups.map((g, i) => {
              const cs = deriveColorSet(g.name);
              return (
                <Animated.View key={g.name} entering={FadeInDown.delay(40 * i).springify()}>
                  <TouchableOpacity
                    style={[styles.classCard, { backgroundColor: cs.color }]}
                    activeOpacity={0.88}
                    onPress={() => setPicker(g)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardClassName}>{gradeLabel(g.name)}</Text>
                        <Text style={styles.cardSubject}>
                          {g.options.length} section{g.options.length > 1 ? 's' : ''} · tap to
                          choose
                        </Text>
                      </View>
                      <View style={styles.iconBadge}>
                        <Ionicons name="school" size={20} color={cs.color} />
                      </View>
                    </View>

                    {g.total === 0 ? (
                      <Text style={styles.cardCount}>No students</Text>
                    ) : (
                      <>
                        <View style={styles.cardAttRow}>
                          <Text style={styles.cardCount}>
                            Present {g.present}/{g.total}
                          </Text>
                          <Text style={styles.cardPct}>{g.pct}%</Text>
                        </View>
                        <View style={styles.cardBarTrack}>
                          <View style={[styles.cardBarFill, { width: `${g.pct}%` }]} />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              );
            })}

            {/* Staff */}
            <Text style={styles.section}>Staff</Text>
            <Animated.View entering={FadeInDown.springify()}>
              <TouchableOpacity
                style={styles.staffCard}
                activeOpacity={0.9}
                onPress={() => setStaffView('teaching')}
              >
                <View style={[styles.staffIcon, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="school" size={20} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffCardTitle}>Teaching staff</Text>
                  <Text style={styles.staffCardMeta}>
                    {presentCount(teachingStaff)}/{teachingStaff.length} checked in · tap to view
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.inkSoft} />
              </TouchableOpacity>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(60).springify()}>
              <TouchableOpacity
                style={styles.staffCard}
                activeOpacity={0.9}
                onPress={() => setStaffView('support')}
              >
                <View style={[styles.staffIcon, { backgroundColor: Colors.teal }]}>
                  <Ionicons name="people" size={20} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffCardTitle}>Non-teaching staff</Text>
                  <Text style={styles.staffCardMeta}>
                    {presentCount(supportStaff)}/{supportStaff.length} checked in · tap to view
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.inkSoft} />
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </ScrollView>

      <SectionPickerModal
        visible={!!picker}
        gradeName={picker ? gradeLabel(picker.name) : null}
        sections={picker?.options ?? []}
        onSelect={openAttendance}
        onClose={() => setPicker(null)}
      />

      <TeacherSubjectDrawer
        visible={staffView !== null}
        title={staffView === 'support' ? 'Non-teaching staff' : 'Teaching staff'}
        staff={staffView === 'support' ? supportStaff : teachingStaff}
        onClose={() => setStaffView(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  h1: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 16 },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 20,
    marginBottom: 8,
    ...Shadows.card,
  },
  totalPct: { fontFamily: FontFamily.extraBold, fontSize: 34, color: Colors.primary },
  totalCount: { fontFamily: FontFamily.bold, fontSize: 20, color: Colors.ink },
  totalRight: { alignItems: 'flex-end' },
  totalLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  section: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.ink,
    marginTop: 22,
    marginBottom: 10,
  },
  sectionHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: -6,
    marginBottom: 10,
  },
  classCard: {
    borderRadius: Radii.xl,
    padding: 18,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardClassName: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.white },
  cardSubject: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 3,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAttRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  cardCount: { fontFamily: FontFamily.semiBold, fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  cardPct: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.white },
  cardBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  cardBarFill: { height: 6, borderRadius: 3, backgroundColor: Colors.white },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  staffIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCardTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  staffCardMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
});
