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
import { ScreenHeader, TeacherSubjectDrawer, SearchField } from '../../components';
import { AttendanceGradeCard } from '../../components/attendance/AttendanceGradeCard';
import { GradeListViewMore } from '../../components/attendance/GradeListViewMore';
import { hiddenGradeCount, visibleGradeItems } from '../../components/attendance/gradeList';
import { usePrincipalAttendance } from '@/features/principal/hooks';
import { useClasses } from '@/features/classes/hooks';
import { formatLongDate } from '@/lib/date';
import { classGroupKey } from '@/lib/classLabel';
import { filterGradesBySearch } from '@/lib/gradeSearch';
import { splitStaffByCategory, staffDisplayLabel } from '@/lib/staffCategory';
import { filterStaffBySearch } from '@/lib/staffSearch';
import { staffCheckInStatus } from '@/lib/staffCheckIn';
import { compareGrades, sortBySection } from '@/lib/gradeSort';
import { useStudentSearchAcrossClasses } from '@/features/students/useStudentSearch';

import { StudentSearchMatchRow } from '../../components/attendance/StudentSearchMatchRow';
import { useFeature } from '@/features/plan/hooks';
import { TIER_META } from '@/lib/gating';
import type { PrincipalHomeStackParamList } from '../../navigation/types';

type PAttendanceNav = NativeStackNavigationProp<
  PrincipalHomeStackParamList,
  'PrincipalAttendanceScreen'
>;

type GradeGroup = {
  name: string;
  present: number;
  total: number;
  pct: number;
  sectionCount: number;
  sections: string[];
};

export const PrincipalAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PAttendanceNav>();
  const { data, isLoading, isError } = usePrincipalAttendance();
  const { data: classList = [] } = useClasses();

  const [staffView, setStaffView] = useState<'teaching' | 'support' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradesExpanded, setGradesExpanded] = useState(false);
  const geofence = useFeature('attendance.geofence');

  const {
    matches: studentMatches,
    isLoading: studentSearchLoading,
    isSearching,
  } = useStudentSearchAcrossClasses(classList, searchQuery);

  const classById = useMemo(() => Object.fromEntries(classList.map((c) => [c.id, c])), [classList]);

  const attendanceByClassId = useMemo(
    () => Object.fromEntries((data?.classes ?? []).map((c) => [c.classId, c])),
    [data?.classes]
  );

  const allStaff = data?.staff ?? [];
  const { teaching: teachingStaff, nonTeaching: supportStaff } = splitStaffByCategory(allStaff);
  const presentCount = (list: typeof allStaff) => list.filter((s) => s.checkedIn).length;

  const gradeGroups = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, GradeGroup>();

    for (const cls of classList) {
      const att = attendanceByClassId[cls.id];
      const name = classGroupKey(cls);
      const g = map.get(name) ?? {
        name,
        present: 0,
        total: 0,
        pct: 0,
        sectionCount: 0,
        sections: [],
      };
      g.present += att?.present ?? 0;
      g.total += att?.total ?? 0;
      g.sectionCount += 1;
      g.sections.push(cls.section);
      map.set(name, g);
    }

    for (const c of data?.classes ?? []) {
      if (classById[c.classId]) continue;
      const name = c.className;
      const g = map.get(name) ?? {
        name,
        present: 0,
        total: 0,
        pct: 0,
        sectionCount: 0,
        sections: [],
      };
      g.present += c.present;
      g.total += c.total;
      g.sectionCount += 1;
      const section = c.className.includes('-') ? (c.className.split('-').pop() ?? '?') : '?';
      g.sections.push(section);
      map.set(name, g);
    }

    return [...map.values()]
      .map((g) => ({
        ...g,
        pct: g.total ? Math.round((g.present / g.total) * 100) : 0,
        sections: sortBySection(g.sections, (section) => section),
      }))
      .sort((a, b) => compareGrades(a.name, b.name));
  }, [classList, data?.classes, classById, attendanceByClassId]);

  const filteredGradeGroups = useMemo(
    () =>
      filterGradesBySearch(
        gradeGroups,
        searchQuery,
        (g) => g.name,
        (g) => g.sections
      ),
    [gradeGroups, searchQuery]
  );

  const filteredTeachingStaff = useMemo(
    () => filterStaffBySearch(teachingStaff, searchQuery),
    [teachingStaff, searchQuery]
  );
  const filteredSupportStaff = useMemo(
    () => filterStaffBySearch(supportStaff, searchQuery),
    [supportStaff, searchQuery]
  );

  const hasClassMatches = filteredGradeGroups.length > 0;
  const hasStaffMatches = filteredTeachingStaff.length > 0 || filteredSupportStaff.length > 0;
  const hasStudentMatches = studentMatches.length > 0;
  const hasAnySearchMatch = hasClassMatches || hasStaffMatches || hasStudentMatches;
  const showGradeCards = !isSearching || hasClassMatches;
  const showStudentResults = isSearching && (hasStudentMatches || studentSearchLoading);
  const showStaffInline = isSearching && hasStaffMatches;
  const showStaffCategoryCards = !isSearching && allStaff.length > 0;
  const showNoSearchResults = isSearching && !studentSearchLoading && !hasAnySearchMatch;
  const displayGradeGroups = visibleGradeItems(filteredGradeGroups, gradesExpanded, isSearching);
  const hiddenGrades = hiddenGradeCount(filteredGradeGroups, gradesExpanded, isSearching);

  const inlineStaffMatches = useMemo(
    () =>
      isSearching
        ? [
            ...filteredTeachingStaff.map((member) => ({
              ...member,
              category: 'teaching' as const,
            })),
            ...filteredSupportStaff.map((member) => ({
              ...member,
              category: 'support' as const,
            })),
          ]
        : [],
    [isSearching, filteredTeachingStaff, filteredSupportStaff]
  );

  const dateLabel = data?.date ? formatLongDate(data.date) : 'Today';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader title="Attendance" subtitle="Select a class, then a section" showBack />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.inkMuted} />
          <Text style={styles.dateText}>{dateLabel}</Text>
        </Animated.View>

        {isError ? (
          <Text style={styles.emptyFilter}>Failed to load attendance. Please try again.</Text>
        ) : isLoading || !data ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify()} style={styles.totalCard}>
              <Text style={styles.totalPct}>{data.overallPct}%</Text>
              <View style={styles.totalMeta}>
                <Text style={styles.totalLabel}>School present today</Text>
                <Text style={styles.totalCount}>
                  {data.presentTotal}/{data.studentTotal} students
                </Text>
              </View>
            </Animated.View>

            {!geofence.allowed && (
              <View style={styles.geoBanner}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.inkMuted} />
                <Text style={styles.geoBannerText}>
                  Staff GPS check-in details require the {TIER_META.platinum.label} plan. Checked-in
                  status may be hidden on your current plan.
                </Text>
              </View>
            )}

            <View style={styles.searchWrap}>
              <SearchField
                placeholder="Search class, section, staff, or student..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (text.trim()) setGradesExpanded(false);
                }}
              />
            </View>

            {showNoSearchResults && <Text style={styles.emptyFilter}>No matching results</Text>}
            {showStudentResults && (
              <>
                <Text style={styles.section}>Students</Text>
                {studentSearchLoading && !hasStudentMatches && (
                  <ActivityIndicator color={Colors.primary} style={{ marginVertical: 12 }} />
                )}
                {studentMatches.map((student) => (
                  <StudentSearchMatchRow
                    key={student.id}
                    name={student.name}
                    initials={student.initials}
                    contextLabel={student.contextLabel}
                    roll={student.roll}
                    onPress={() =>
                      navigation.navigate('AttendanceScreen', { classId: student.classId })
                    }
                  />
                ))}
              </>
            )}
            {showGradeCards && <Text style={styles.section}>Students by class</Text>}
            {showGradeCards &&
              displayGradeGroups.map((g, i) => (
                <Animated.View key={g.name} entering={FadeInDown.delay(40 * i).springify()}>
                  <AttendanceGradeCard
                    gradeName={g.name}
                    sectionCount={g.sectionCount}
                    present={g.present}
                    total={g.total}
                    pct={g.total > 0 ? g.pct : null}
                    onPress={() =>
                      navigation.navigate('AttendancePickSection', { gradeName: g.name })
                    }
                  />
                </Animated.View>
              ))}
            {showGradeCards && (
              <GradeListViewMore
                hiddenCount={hiddenGrades}
                expanded={gradesExpanded}
                onExpand={() => setGradesExpanded(true)}
                onCollapse={() => setGradesExpanded(false)}
              />
            )}

            {showStaffInline && <Text style={styles.section}>Staff</Text>}
            {showStaffInline &&
              inlineStaffMatches.map((member) => {
                const status = staffCheckInStatus(member);
                return (
                  <View key={member.teacherId} style={styles.staffMatchRow}>
                    <View
                      style={[
                        styles.staffMatchIcon,
                        {
                          backgroundColor:
                            member.category === 'teaching' ? Colors.primary : Colors.teal,
                        },
                      ]}
                    >
                      <Text style={styles.staffMatchInitials}>{member.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffMatchName}>{member.name}</Text>
                      <Text style={styles.staffMatchMeta}>
                        {member.category === 'teaching' ? 'Teaching' : 'Non-teaching'}
                        {' · '}
                        {staffDisplayLabel(member)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.staffMatchStatus,
                        {
                          backgroundColor: member.checkedIn
                            ? status.flagged
                              ? Colors.lateSoft
                              : Colors.presentSoft
                            : Colors.paper2,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.staffMatchStatusText,
                          {
                            color: member.checkedIn
                              ? status.flagged
                                ? Colors.late
                                : Colors.present
                              : Colors.inkMuted,
                          },
                        ]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            {showStaffCategoryCards && teachingStaff.length > 0 && (
              <Animated.View entering={FadeInDown.springify()}>
                <TouchableOpacity
                  style={styles.staffCard}
                  activeOpacity={0.88}
                  onPress={() => setStaffView('teaching')}
                >
                  <View style={[styles.staffIcon, { backgroundColor: Colors.primary }]}>
                    <Ionicons name="school" size={18} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffCardTitle}>Teaching staff</Text>
                    <Text style={styles.staffCardMeta}>
                      {presentCount(teachingStaff)}/{teachingStaff.length} checked in
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                </TouchableOpacity>
              </Animated.View>
            )}
            {showStaffCategoryCards && supportStaff.length > 0 && (
              <Animated.View entering={FadeInDown.delay(60).springify()}>
                <TouchableOpacity
                  style={styles.staffCard}
                  activeOpacity={0.88}
                  onPress={() => setStaffView('support')}
                >
                  <View style={[styles.staffIcon, { backgroundColor: Colors.teal }]}>
                    <Ionicons name="people" size={18} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffCardTitle}>Non-teaching staff</Text>
                    <Text style={styles.staffCardMeta}>
                      {presentCount(supportStaff)}/{supportStaff.length} checked in
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                </TouchableOpacity>
              </Animated.View>
            )}
          </>
        )}
      </ScrollView>

      <TeacherSubjectDrawer
        visible={staffView !== null}
        title={staffView === 'support' ? 'Non-teaching staff' : 'Teaching staff'}
        staff={staffView === 'support' ? supportStaff : teachingStaff}
        initialSearch={searchQuery}
        onClose={() => setStaffView(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 10 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  dateText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.inkMuted,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: 20,
    marginBottom: 8,
    ...Shadows.card,
  },
  geoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 4,
  },
  geoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    lineHeight: 17,
  },
  totalPct: { fontFamily: FontFamily.extraBold, fontSize: 40, color: Colors.white },
  totalMeta: { flex: 1, gap: 4 },
  totalCount: { fontFamily: FontFamily.semiBold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  totalLabel: { fontFamily: FontFamily.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  section: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  searchWrap: { marginBottom: 8 },
  emptyFilter: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
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
  staffMatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  staffMatchIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffMatchInitials: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  staffMatchName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  staffMatchMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  staffMatchStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  staffMatchStatusText: { fontFamily: FontFamily.bold, fontSize: 12 },
});
