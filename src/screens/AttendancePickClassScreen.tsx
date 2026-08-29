import React, { useMemo, useState } from 'react';

import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import Animated, { FadeInDown } from 'react-native-reanimated';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors } from '../theme';

import { FontFamily } from '../theme/typography';

import { ScreenHeader, SearchField } from '../components';

import { AttendanceGradeCard } from '../components/attendance/AttendanceGradeCard';
import { GradeListViewMore } from '../components/attendance/GradeListViewMore';
import { hiddenGradeCount, visibleGradeItems } from '../components/attendance/gradeList';

import { useClasses } from '@/features/classes/hooks';
import { useAuth } from '@/features/auth/AuthProvider';

import { useSectionAttendanceSummaries } from '@/features/attendance/hooks';

import { aggregateSections } from '@/features/attendance/gradeSummary';

import { todayISO, formatLongDate } from '@/lib/date';

import { classGroupKey } from '@/lib/classLabel';
import { filterGradesBySearch } from '@/lib/gradeSearch';
import { compareGrades, sortBySection } from '@/lib/gradeSort';
import { useStudentSearchAcrossClasses } from '@/features/students/useStudentSearch';
import { StudentSearchMatchRow } from '../components/attendance/StudentSearchMatchRow';

import type { HomeStackParamList } from '../navigation/types';
import {
  classPickCopy,
  resolveFlow,
  type ClassSectionFlow,
  type ClassSectionPickClassParams,
} from '../navigation/classSectionFlow';

type AttPickNav = NativeStackNavigationProp<HomeStackParamList, 'AttendancePickClass'>;

type GradeGroup = { name: string; sections: { id: string; section: string }[] };

type ClassPickProps = {
  flowOverride?: ClassSectionFlow;
};

export const AttendancePickClassScreen: React.FC<ClassPickProps> = ({ flowOverride }) => {
  const navigation = useNavigation<AttPickNav>();
  const route = useRoute();
  const flow = resolveFlow(
    flowOverride ?? (route.params as ClassSectionPickClassParams | undefined)?.flow
  );
  const copy = classPickCopy(flow);
  const isAttendance = flow === 'attendance';

  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [gradesExpanded, setGradesExpanded] = useState(false);

  const today = todayISO();

  const { data: classes = [], isLoading, isError } = useClasses();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const {
    matches: studentMatches,
    isLoading: studentSearchLoading,
    isSearching,
  } = useStudentSearchAcrossClasses(classes, search);

  const { bySection, isLoading: summariesLoading } = useSectionAttendanceSummaries(
    classes.map((c) => c.id),

    today
  );

  const grades = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, { id: string; section: string }[]>();

    for (const c of classes) {
      const key = classGroupKey(c);

      const arr = map.get(key) ?? [];

      arr.push({ id: c.id, section: c.section });

      map.set(key, arr);
    }

    return [...map.entries()]

      .map(([name, sections]) => ({
        name,

        sections: sortBySection(sections, (s) => s.section),
      }))

      .sort((a, b) => compareGrades(a.name, b.name));
  }, [classes]);

  const filteredGrades = useMemo(
    () =>
      filterGradesBySearch(
        grades,
        search,
        (g) => g.name,
        (g) => g.sections.map((s) => s.section)
      ),
    [grades, search]
  );

  const isSearchingGrades = search.trim().length > 0;
  const hasClassMatches = filteredGrades.length > 0;
  const hasStudentMatches = studentMatches.length > 0;
  const hasAnySearchMatch = hasClassMatches || hasStudentMatches;
  const showGradeCards = !isSearchingGrades || hasClassMatches;
  const showStudentResults = isSearching && (hasStudentMatches || studentSearchLoading);
  const showNoSearchResults = isSearching && !studentSearchLoading && !hasAnySearchMatch;
  const displayGrades = visibleGradeItems(filteredGrades, gradesExpanded, isSearchingGrades);
  const hiddenGrades = hiddenGradeCount(filteredGrades, gradesExpanded, isSearching);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title={copy.title} subtitle={copy.subtitle} showBack />
      </Animated.View>

      {isAttendance && (
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={Colors.inkMuted} />

          <Text style={styles.dateText}>{formatLongDate(today)}</Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.searchWrap}>
        <SearchField
          placeholder="Search class, section, or student..."
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            if (text.trim()) setGradesExpanded(false);
          }}
        />
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
          <Text style={styles.emptyText}>
            {isPrincipal
              ? 'No classes set up in CRM yet.'
              : 'No classes assigned to you yet. Ask admin to link your timetable in SMS CRM.'}
          </Text>
        </View>
      )}

      {!isLoading && !isError && grades.length > 0 && showNoSearchResults && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No matching results</Text>
        </View>
      )}

      {showStudentResults && (
        <>
          <Text style={styles.sectionLabel}>Students</Text>

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
              onPress={() => {
                if (flow === 'marks') {
                  navigation.navigate('MarksPickExam', { classId: student.classId });
                } else if (flow === 'timetable') {
                  (
                    navigation as AttPickNav & { navigate: (name: string, params: object) => void }
                  ).navigate('ClassTimetableScreen', { classId: student.classId });
                } else {
                  navigation.navigate('AttendanceScreen', { classId: student.classId });
                }
              }}
            />
          ))}
        </>
      )}

      {showGradeCards &&
        displayGrades.map((g, i) => {
          const summary = aggregateSections(
            g.sections.map((s) => bySection[s.id] ?? { total: 0, present: 0 })
          );

          return (
            <Animated.View key={g.name} entering={FadeInDown.delay(140 + i * 60).springify()}>
              <AttendanceGradeCard
                gradeName={g.name}
                sectionCount={g.sections.length}
                present={summary.present}
                total={summary.total}
                pct={summary.pct}
                summaryLoading={summariesLoading}
                mode={isAttendance ? 'attendance' : 'picker'}
                onPress={() =>
                  navigation.navigate('AttendancePickSection', { gradeName: g.name, flow })
                }
              />
            </Animated.View>
          );
        })}

      {showGradeCards && (
        <GradeListViewMore
          hiddenCount={hiddenGrades}
          expanded={gradesExpanded}
          onExpand={() => setGradesExpanded(true)}
          onCollapse={() => setGradesExpanded(false)}
        />
      )}
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

    gap: 10,
  },

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

  searchWrap: {
    marginBottom: 4,
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

  sectionLabel: {
    fontFamily: FontFamily.bold,

    fontSize: 15,

    color: Colors.ink,

    marginTop: 4,

    marginBottom: 4,
  },
});
