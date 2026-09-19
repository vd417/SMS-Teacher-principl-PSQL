import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ScreenHeader, SearchField } from '../../components';
import { AttendanceGradeCard } from '../../components/attendance/AttendanceGradeCard';
import { GradeListViewMore } from '../../components/attendance/GradeListViewMore';
import { hiddenGradeCount, visibleGradeItems } from '../../components/attendance/gradeList';
import { usePrincipalAttendance } from '@/features/principal/hooks';
import { useClasses } from '@/features/classes/hooks';
import { formatLongDate, parseISO, todayISO } from '@/lib/date';
import { classGroupKey } from '@/lib/classLabel';
import { filterGradesBySearch } from '@/lib/gradeSearch';
import { compareGrades, sortBySection } from '@/lib/gradeSort';
import { useStudentSearchAcrossClasses } from '@/features/students/useStudentSearch';

import { StudentSearchMatchRow } from '../../components/attendance/StudentSearchMatchRow';
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
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const { data, isLoading, isError } = usePrincipalAttendance(selectedDate);
  const { data: classList = [] } = useClasses();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradesExpanded, setGradesExpanded] = useState(false);

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

  const hasClassMatches = filteredGradeGroups.length > 0;
  const hasStudentMatches = studentMatches.length > 0;
  const hasAnySearchMatch = hasClassMatches || hasStudentMatches;
  const showGradeCards = !isSearching || hasClassMatches;
  const showStudentResults = isSearching && (hasStudentMatches || studentSearchLoading);
  const showNoSearchResults = isSearching && !studentSearchLoading && !hasAnySearchMatch;
  const displayGradeGroups = visibleGradeItems(filteredGradeGroups, gradesExpanded, isSearching);
  const hiddenGrades = hiddenGradeCount(filteredGradeGroups, gradesExpanded, isSearching);

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
          <Pressable
            style={styles.dateRowPress}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Change date"
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.inkMuted} />
            <Text style={styles.dateText}>{dateLabel}</Text>
          </Pressable>
          {selectedDate !== todayISO() ? (
            <Pressable onPress={() => setSelectedDate(todayISO())}>
              <Text style={styles.todayLink}>Today</Text>
            </Pressable>
          ) : null}
          {showDatePicker ? (
            <DateTimePicker
              value={parseISO(selectedDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, picked?: Date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (picked) setSelectedDate(todayISO(picked));
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && showDatePicker ? (
            <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDone}>
              <Text style={styles.todayLink}>Done</Text>
            </Pressable>
          ) : null}
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

            <View style={styles.searchWrap}>
              <SearchField
                placeholder="Search class, section, or student..."
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
          </>
        )}
      </ScrollView>
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
    gap: 12,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  dateRowPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayLink: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  datePickerDone: { paddingVertical: 4, paddingHorizontal: 4 },
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
});
