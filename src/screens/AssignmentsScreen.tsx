import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill } from '../components';
import { useAssignments } from '@/features/assignments/hooks';
import { useClasses } from '@/features/classes/hooks';
import { useTimetable } from '@/features/timetable/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSchoolTeachers } from '@/features/teachers/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import { classIdsForTeacher, homeroomTeacherName, teacherNameMap } from '@/lib/academicsScope';
import { classLabel } from '@/lib/classLabel';
import type { AssignmentStatus } from '@/data/domain';
import type {
  HomeStackParamList,
  PrincipalHomeStackParamList,
  PrincipalClassesStackParamList,
} from '../navigation/types';

type AssignmentsRoute = RouteProp<
  HomeStackParamList & PrincipalHomeStackParamList & PrincipalClassesStackParamList,
  'AssignmentsScreen'
>;
type AssignmentsNav = NativeStackNavigationProp<
  HomeStackParamList & PrincipalHomeStackParamList & PrincipalClassesStackParamList,
  'AssignmentsScreen'
>;

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  active: 'Active',
  due_soon: 'Due Soon',
  overdue: 'Overdue',
  closed: 'Closed',
};
const STATUS_COLORS: Record<AssignmentStatus, string> = {
  active: Colors.present,
  due_soon: Colors.late,
  overdue: Colors.absent,
  closed: Colors.inkMuted,
};
const STATUS_SOFT: Record<AssignmentStatus, string> = {
  active: Colors.presentSoft,
  due_soon: Colors.lateSoft,
  overdue: Colors.absentSoft,
  closed: Colors.ruleSoft,
};

export const AssignmentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AssignmentsNav>();
  const route = useRoute<AssignmentsRoute>();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';

  const routeClassId = route.params?.classId;
  const routeTeacherId = route.params?.teacherId;
  const routeTeacherName = route.params?.teacherName;

  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [classFilter, setClassFilter] = useState<string | 'all'>(routeClassId ?? 'all');

  const { data: assignments = [], isLoading, isError, refetch } = useAssignments();
  const { data: classes = [] } = useClasses();
  const { data: timetable = [] } = useTimetable();
  const { data: teachers = [] } = useSchoolTeachers();

  const teacherNames = useMemo(() => teacherNameMap(teachers), [teachers]);

  const teacherClassIds = useMemo(() => {
    if (!routeTeacherId) return null;
    return classIdsForTeacher(routeTeacherId, routeTeacherName ?? '', classes, timetable);
  }, [routeTeacherId, routeTeacherName, classes, timetable]);

  const scoped = useMemo(() => {
    let rows = assignments;
    if (teacherClassIds) {
      rows = rows.filter((a) => a.classId && teacherClassIds.has(a.classId));
    }
    if (classFilter !== 'all') {
      rows = rows.filter((a) => a.classId === classFilter);
    }
    if (statusFilter !== 'all') {
      rows = rows.filter((a) => a.status === statusFilter);
    }
    return rows;
  }, [assignments, teacherClassIds, classFilter, statusFilter]);

  const subtitle = routeTeacherName
    ? `${scoped.length} for ${routeTeacherName}`
    : classFilter !== 'all'
      ? `${scoped.length} · ${classLabel(
          classes.find((c) => c.id === classFilter)?.name ?? '',
          classes.find((c) => c.id === classFilter)?.section ?? '',
          ' – '
        )}`
      : isPrincipal
        ? `${scoped.length} school-wide · not tests or exams`
        : `${assignments.length} · not tests or exams`;

  const emptyLabel =
    classes.length === 0
      ? 'No classes in this school yet.'
      : scoped.length === 0 && assignments.length === 0
        ? 'No homework in CRM yet.'
        : 'No homework matches this filter.';

  const STATUS_FILTERS: { label: string; value: AssignmentStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Due Soon', value: 'due_soon' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Closed', value: 'closed' },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader
          title="Homework"
          subtitle={subtitle}
          showBack
          rightComponent={
            !isPrincipal ? (
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('AssignmentNewScreen')}
                accessibilityLabel="New homework"
              >
                <Ionicons name="add" size={22} color={Colors.white} />
              </TouchableOpacity>
            ) : undefined
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

      {isLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} radius={12} />
          ))}
        </>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : scoped.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        scoped.map((asgn, i) => {
          const cs = deriveColorSet(asgn.id);
          const submittedPct =
            asgn.totalStudents > 0
              ? Math.round((asgn.submissionsCount / asgn.totalStudents) * 100)
              : 0;
          const teacherLabel = asgn.classId
            ? homeroomTeacherName(asgn.classId, classes, teacherNames)
            : '';
          return (
            <Animated.View key={asgn.id} entering={FadeInDown.delay(140 + i * 60).springify()}>
              <TouchableOpacity
                style={styles.asgnCard}
                onPress={() =>
                  navigation.navigate('AssignmentNewScreen', { assignmentId: asgn.id })
                }
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${asgn.title}`}
              >
                <View style={[styles.colorBar, { backgroundColor: cs.color }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.asgnTitle} numberOfLines={1}>
                      {asgn.title}
                    </Text>
                    <Pill
                      label={STATUS_LABELS[asgn.status]}
                      color={STATUS_COLORS[asgn.status]}
                      backgroundColor={STATUS_SOFT[asgn.status]}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.asgnClass}>
                    {asgn.className} · {asgn.subject || '—'}
                    {asgn.period ? ` · P${asgn.period}` : ''}
                    {isPrincipal && teacherLabel ? ` · ${teacherLabel}` : ''}
                  </Text>
                  {asgn.description ? (
                    <Text style={styles.asgnDesc} numberOfLines={2}>
                      {asgn.description}
                    </Text>
                  ) : null}
                  {asgn.imageUri ? (
                    <Image
                      source={{ uri: asgn.imageUri }}
                      style={styles.asgnImage}
                      resizeMode="cover"
                    />
                  ) : null}
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color={Colors.inkMuted} />
                      <Text style={styles.metaText}>Due: {asgn.dueDate}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="document-text-outline" size={13} color={Colors.inkMuted} />
                      <Text style={styles.metaText}>
                        {asgn.submissionsCount}/{asgn.totalStudents} submitted
                      </Text>
                    </View>
                  </View>

                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${submittedPct}%` as `${number}%`,
                          backgroundColor: cs.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressLabel, { color: cs.color }]}>
                    {submittedPct}% submitted
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })
      )}
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
  asgnCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  colorBar: { width: 5 },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  asgnTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    flex: 1,
    marginRight: 8,
  },
  asgnClass: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 8,
  },
  asgnDesc: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.ink3,
    marginBottom: 8,
  },
  asgnImage: {
    width: '100%',
    height: 140,
    borderRadius: Radii.md,
    backgroundColor: Colors.paper2,
    marginBottom: 10,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  progressBar: {
    height: 6,
    backgroundColor: Colors.ruleSoft,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  progressLabel: { fontFamily: FontFamily.semiBold, fontSize: 12 },
});
