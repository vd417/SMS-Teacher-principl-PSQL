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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill } from '../components';
import { useExams } from '../features/exams/hooks';
import { useClasses } from '@/features/classes/hooks';
import { useTimetable } from '@/features/timetable/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSchoolTeachers } from '@/features/teachers/hooks';
import { deriveColorSet } from '../theme/derive';
import { classIdsForTeacher, homeroomTeacherName, teacherNameMap } from '@/lib/academicsScope';
import { isClassTest } from '@/lib/examPublish';
import { classLabel } from '@/lib/classLabel';
import type { ExamStatus } from '../data/domain';
import type {
  HomeStackParamList,
  PrincipalHomeStackParamList,
  PrincipalClassesStackParamList,
} from '../navigation/types';

type ExamsRoute = RouteProp<
  HomeStackParamList & PrincipalHomeStackParamList & PrincipalClassesStackParamList,
  'ExamsScreen'
>;
type ExamsNav = NativeStackNavigationProp<
  HomeStackParamList & PrincipalHomeStackParamList & PrincipalClassesStackParamList,
  'ExamsScreen'
>;

const STATUS_FILTERS: { label: string; value: ExamStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Draft', value: 'draft' },
];

const STATUS_LABELS: Record<ExamStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  draft: 'Draft',
};

const STATUS_COLORS: Record<ExamStatus, string> = {
  upcoming: Colors.blue,
  completed: Colors.present,
  draft: Colors.inkMuted,
};

const STATUS_SOFT: Record<ExamStatus, string> = {
  upcoming: Colors.blueSoft,
  completed: Colors.presentSoft,
  draft: Colors.ruleSoft,
};

export const ExamsScreen: React.FC = () => {
  const navigation = useNavigation<ExamsNav>();
  const route = useRoute<ExamsRoute>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';

  const routeClassId = route.params?.classId;
  const routeTeacherId = route.params?.teacherId;
  const routeTeacherName = route.params?.teacherName;

  const [statusFilter, setStatusFilter] = useState<ExamStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<string | 'all'>(routeClassId ?? 'all');

  const { data: exams = [], isLoading, isError, refetch } = useExams();
  const { data: classes = [] } = useClasses();
  const { data: timetable = [] } = useTimetable();
  const { data: teachers = [] } = useSchoolTeachers();

  const teacherNames = useMemo(() => teacherNameMap(teachers), [teachers]);

  const teacherClassIds = useMemo(() => {
    if (!routeTeacherId) return null;
    return classIdsForTeacher(routeTeacherId, routeTeacherName ?? '', classes, timetable);
  }, [routeTeacherId, routeTeacherName, classes, timetable]);

  const scoped = useMemo(() => {
    let rows = exams;
    if (teacherClassIds) {
      rows = rows.filter((e) => teacherClassIds.has(e.classId));
    }
    if (classFilter !== 'all') {
      rows = rows.filter((e) => e.classId === classFilter);
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((e) => e.status === statusFilter);
    }
    return rows;
  }, [exams, teacherClassIds, classFilter, statusFilter]);

  const subtitle = routeTeacherName
    ? `${scoped.length} for ${routeTeacherName}`
    : classFilter !== 'all'
      ? `${scoped.length} · ${classLabel(
          classes.find((c) => c.id === classFilter)?.name ?? '',
          classes.find((c) => c.id === classFilter)?.section ?? '',
          ' – '
        )}`
      : isPrincipal
        ? `${scoped.length} school-wide · published terms only`
        : `${exams.length} scheduled · marks & datesheet`;

  const emptyLabel =
    classes.length === 0
      ? 'No classes in this school yet.'
      : scoped.length === 0 && exams.length === 0
        ? 'No class tests yet. CRM exams appear here when published.'
        : 'No tests or exams match this filter.';

  const openExam = (examId: string, classId: string) => {
    if (isPrincipal) {
      navigation.navigate('MarksEntryScreen', { examId });
      return;
    }
    navigation.navigate('ExamDetail', { examId });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader
          title="Tests & Exams"
          subtitle={subtitle}
          showBack
          rightComponent={
            <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('ExamNew')}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.newBtnText}>New test</Text>
            </TouchableOpacity>
          }
        />
      </Animated.View>

      {isPrincipal && !routeTeacherId && (
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <Text style={styles.scopeLabel}>Class</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterRow}
            contentContainerStyle={styles.filterContent}
          >
            <TouchableOpacity
              style={[styles.filterChip, classFilter === 'all' && styles.filterChipActive]}
              onPress={() => setClassFilter('all')}
            >
              <Text style={[styles.filterLabel, classFilter === 'all' && styles.filterLabelActive]}>
                All classes
              </Text>
            </TouchableOpacity>
            {classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.filterChip, classFilter === c.id && styles.filterChipActive]}
                onPress={() => setClassFilter(c.id)}
              >
                <Text
                  style={[styles.filterLabel, classFilter === c.id && styles.filterLabelActive]}
                >
                  {classLabel(c.name, c.section, ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
              onPress={() => setStatusFilter(f.value)}
            >
              <Text
                style={[styles.filterLabel, statusFilter === f.value && styles.filterLabelActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load exams.</Text>
          <TouchableOpacity onPress={() => void refetch()}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && scoped.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </View>
      )}

      {scoped.map((exam, i) => {
        const { color } = deriveColorSet(exam.id);
        const teacherLabel = homeroomTeacherName(exam.classId, classes, teacherNames);
        return (
          <Animated.View key={exam.id} entering={FadeInDown.delay(140 + i * 60).springify()}>
            <TouchableOpacity
              style={styles.examCard}
              onPress={() => openExam(exam.id, exam.classId)}
              activeOpacity={0.85}
            >
              <View style={[styles.examColorBar, { backgroundColor: color }]} />
              <View style={styles.examContent}>
                <View style={styles.examHeader}>
                  <Text style={styles.examTitle} numberOfLines={1}>
                    {exam.title}
                  </Text>
                  <View style={styles.pills}>
                    <Pill
                      label={isClassTest(exam) ? 'Test' : 'Exam'}
                      color={isClassTest(exam) ? Colors.primary : Colors.inkMuted}
                      backgroundColor={isClassTest(exam) ? Colors.primarySoft : Colors.ruleSoft}
                      size="sm"
                    />
                    <Pill
                      label={STATUS_LABELS[exam.status]}
                      color={STATUS_COLORS[exam.status]}
                      backgroundColor={STATUS_SOFT[exam.status]}
                      size="sm"
                    />
                  </View>
                </View>
                <Text style={styles.examClass}>
                  {exam.className} · {exam.subject}
                  {isPrincipal && teacherLabel ? ` · ${teacherLabel}` : ''}
                </Text>
                <View style={styles.examMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{exam.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{exam.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="hourglass-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{exam.duration}m</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="checkmark-circle-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{exam.maxMarks} marks</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  scopeLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.inkMuted,
    marginBottom: 4,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.white,
  },
  filterRow: { marginBottom: 4 },
  filterContent: { gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.card,
    ...Shadows.card,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  filterLabelActive: { color: Colors.white },
  centered: { paddingVertical: 40, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  retryText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary, marginTop: 8 },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  examCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  examColorBar: { width: 5 },
  examContent: { flex: 1, padding: 14 },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pills: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  examTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    flex: 1,
    marginRight: 8,
  },
  examClass: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 10,
  },
  examMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
});
