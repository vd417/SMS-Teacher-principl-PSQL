import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, ScreenHeader, SearchField } from '../components';
import { ClassListCard } from '@/components/classHub/ClassListCard';
import { StudentListContactActions } from '@/components/students/StudentListContactActions';
import { useClasses } from '@/features/classes/hooks';
import { useStudentsByClass } from '@/features/students/hooks';
import { useExams } from '@/features/exams/hooks';
import { useAssignments } from '@/features/assignments/hooks';
import { useTimetable } from '@/features/timetable/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { classCardColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import { classLabel, classGroupKey } from '@/lib/classLabel';
import { classSubjectForTeacher } from '@/lib/classSubjects';
import { compareGrades, compareSections } from '@/lib/gradeSort';
import { todayISO } from '@/lib/date';
import type { Class, Student, WeekDay } from '@/data/domain';
import type { ClassesStackParamList, PrincipalClassesStackParamList } from '../navigation/types';

type ClassHubStack = ClassesStackParamList & PrincipalClassesStackParamList;
type ClassHubNav = NativeStackNavigationProp<ClassHubStack, 'ClassHubScreen'>;
type HubStep = 'list' | 'detail';

function todayWeekDay(): WeekDay {
  const map: Record<number, WeekDay> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' };
  return map[new Date().getDay()] ?? 'Mon';
}

function sortClasses(classes: Class[]): Class[] {
  return [...classes].sort((a, b) => {
    const byGrade = compareGrades(classGroupKey(a), classGroupKey(b));
    if (byGrade !== 0) return byGrade;
    return compareSections(a.section, b.section);
  });
}

export const ClassHubScreen: React.FC = () => {
  const navigation = useNavigation<ClassHubNav>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const today = todayISO();

  const [step, setStep] = useState<HubStep>('list');
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const { data: classes = [], isLoading, isError, refetch } = useClasses();
  const { data: allHomework = [] } = useAssignments();
  const { data: exams = [] } = useExams();

  useFocusEffect(
    useCallback(() => {
      if (step === 'list') void refetch();
    }, [step, refetch])
  );

  useEffect(() => {
    if (step === 'detail' && selectedClassId && !classes.find((c) => c.id === selectedClassId)) {
      setStep('list');
      setSelectedClassId('');
    }
  }, [step, selectedClassId, classes]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classId = selectedClass?.id ?? '';
  const cs = classCardColorSet(classId);

  const sorted = useMemo(() => sortClasses(classes), [classes]);
  const homeworkByClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of allHomework) {
      if (h.classId) m.set(h.classId, (m.get(h.classId) ?? 0) + 1);
    }
    return m;
  }, [allHomework]);
  const examsByClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of exams) {
      if (e.classId) m.set(e.classId, (m.get(e.classId) ?? 0) + 1);
    }
    return m;
  }, [exams]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        classLabel(c.name, c.section, ' ').toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.room.toLowerCase().includes(q)
    );
  }, [sorted, search]);

  const { data: students = [], isLoading: studentsLoading } = useStudentsByClass(classId);
  const { data: timetable = [], isLoading: timetableLoading } = useTimetable();
  const classExams = useMemo(() => exams.filter((e) => e.classId === classId), [exams, classId]);
  const classHomework = useMemo(
    () => allHomework.filter((h) => h.classId === classId),
    [allHomework, classId]
  );
  const todaySlots = useMemo(
    () =>
      timetable
        .filter((s) => s.classId === classId && s.day === todayWeekDay())
        .sort((a, b) => a.period - b.period),
    [timetable, classId]
  );

  const openClass = (id: string) => {
    setSelectedClassId(id);
    setStep('detail');
  };

  const openAttendance = (id?: string) => {
    const target = id ?? classId;
    if (!target) return;
    navigation.navigate('AttendanceScreen', { classId: target });
  };

  const openExams = () => {
    if (!classId || classExams.length === 0) return;
    if (classExams.length === 1) {
      navigation.navigate('MarksEntryScreen', { examId: classExams[0].id });
    } else {
      navigation.navigate('MarksPickExam', { classId });
    }
  };

  const openTimetable = () => {
    if (!classId) return;
    navigation.navigate('ClassTimetableScreen', { classId });
  };

  const openGrades = () => {
    if (isPrincipal) {
      openExams();
      return;
    }
    navigation.dispatch(
      CommonActions.navigate({ name: 'Home', params: { screen: 'GradesScreen' } })
    );
  };

  const openWork = () => {
    if (!classId) return;
    if (isPrincipal) {
      navigation.navigate('AssignmentsScreen', { classId });
      return;
    }
    navigation.dispatch(
      CommonActions.navigate({ name: 'Home', params: { screen: 'AssignmentsScreen' } })
    );
  };

  const openStudent = (studentId: string) => {
    if (!classId) return;
    navigation.navigate('StudentScreen', { studentId, classId });
  };

  const renderStudent = ({ item: student }: { item: Student }) => {
    const attendancePct = student.attendance ?? 0;
    return (
      <View style={styles.studentRow}>
        <TouchableOpacity
          style={styles.studentRowMain}
          onPress={() => openStudent(student.id)}
          activeOpacity={0.85}
        >
          <Avatar
            initials={student.initials}
            size={44}
            backgroundColor={cs.color}
            photoUri={student.photoUrl}
          />
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.studentRoll}>Roll #{student.roll || '—'}</Text>
          </View>
          <View style={styles.studentRight}>
            <View
              style={[
                styles.attBadge,
                {
                  backgroundColor:
                    attendancePct >= 90
                      ? Colors.presentSoft
                      : attendancePct >= 75
                        ? Colors.lateSoft
                        : Colors.absentSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.attText,
                  {
                    color:
                      attendancePct >= 90
                        ? Colors.present
                        : attendancePct >= 75
                          ? Colors.late
                          : Colors.absent,
                  },
                ]}
              >
                {student.attendance != null ? `${student.attendance}%` : '—'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        <StudentListContactActions
          studentName={student.name}
          parentName={student.parent}
          parentPhone={student.parentPhone}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[styles.screen, { paddingTop: insets.top + 16, paddingHorizontal: 20, gap: 16 }]}
      >
        <Skeleton height={48} />
        <Skeleton height={160} />
        <Skeleton height={160} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
        <ErrorState onRetry={refetch} />
      </View>
    );
  }

  if (step === 'list') {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.listScroll,
          { paddingTop: insets.top + 16, paddingBottom: 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title={isPrincipal ? 'School Classes' : 'My Classes'}
            subtitle={`${classes.length} class${classes.length === 1 ? '' : 'es'}`}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.searchWrap}>
          <SearchField placeholder="Search classes..." value={search} onChangeText={setSearch} />
        </Animated.View>

        {classes.length === 0 ? (
          <EmptyState
            label={
              isPrincipal ? 'No classes set up for this school yet.' : 'No classes assigned yet.'
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState label="No classes match your search" />
        ) : (
          filtered.map((cls, i) => (
            <ClassListCard
              key={cls.id}
              cls={cls}
              index={i}
              today={today}
              onOpenClass={() => openClass(cls.id)}
              onOpenAttendance={() => openAttendance(cls.id)}
              subject={
                isPrincipal ? undefined : classSubjectForTeacher(cls, timetable, session?.user.name)
              }
              homeworkCount={isPrincipal ? (homeworkByClass.get(cls.id) ?? 0) : undefined}
              examCount={isPrincipal ? (examsByClass.get(cls.id) ?? 0) : undefined}
            />
          ))
        )}
      </ScrollView>
    );
  }

  if (step === 'detail' && !selectedClass) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.listScroll,
          { paddingTop: insets.top + 16, paddingBottom: 24 },
        ]}
      >
        <EmptyState label="Class not found" />
      </ScrollView>
    );
  }

  if (step !== 'detail' || !selectedClass) {
    return null;
  }

  const header = (
    <>
      <View style={[styles.hero, { backgroundColor: cs.color, paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={() => setStep('list')}
          style={styles.backBtn}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.heroClass}>
          {classLabel(selectedClass.name, selectedClass.section, ' – ')}
        </Text>
        <Text style={styles.heroSubject}>{selectedClass.subject}</Text>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="people" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroMetaText}>
              {studentsLoading ? '…' : students.length} students
            </Text>
          </View>
          {selectedClass.room ? (
            <View style={styles.heroMetaItem}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroMetaText}>{selectedClass.room}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actionRows}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => openAttendance()}
            activeOpacity={0.88}
          >
            <Ionicons name="checkmark-circle" size={24} color={Colors.present} />
            <Text style={styles.actionLabel}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={openTimetable} activeOpacity={0.88}>
            <Ionicons name="calendar" size={24} color={Colors.indigo} />
            <Text style={styles.actionLabel}>Timetable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={openExams}
            activeOpacity={0.88}
            disabled={classExams.length === 0}
          >
            <Ionicons
              name="document-text"
              size={24}
              color={classExams.length === 0 ? Colors.inkSoft : Colors.coral}
            />
            <Text style={styles.actionLabel}>Exams</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionCard} onPress={openGrades} activeOpacity={0.88}>
            <Ionicons name="ribbon" size={24} color={Colors.blue} />
            <Text style={styles.actionLabel}>Grades</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={openWork}
            activeOpacity={0.88}
            disabled={!isPrincipal && classHomework.length === 0}
          >
            <Ionicons
              name="book"
              size={24}
              color={classHomework.length === 0 && !isPrincipal ? Colors.inkSoft : Colors.orange}
            />
            <Text style={styles.actionLabel}>
              Homework{classHomework.length > 0 ? ` (${classHomework.length})` : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.actionCardSpacer} />
        </View>
      </View>

      <View style={styles.timetablePreview}>
        <View style={styles.timetablePreviewHead}>
          <Text style={styles.timetablePreviewTitle}>Today — {todayWeekDay()}</Text>
          <TouchableOpacity onPress={openTimetable} activeOpacity={0.85}>
            <Text style={[styles.timetablePreviewLink, { color: cs.color }]}>Full week</Text>
          </TouchableOpacity>
        </View>
        {timetableLoading ? (
          <ActivityIndicator color={cs.color} style={{ marginVertical: 8 }} />
        ) : todaySlots.length === 0 ? (
          <Text style={styles.timetableEmpty}>No periods scheduled today</Text>
        ) : (
          todaySlots.map((slot) => (
            <View key={slot.id} style={styles.timetableSlotRow}>
              <Text style={[styles.timetablePeriod, { color: cs.color }]}>P{slot.period}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.timetableSubject}>{slot.subject}</Text>
                <Text style={styles.timetableMeta}>
                  {slot.startTime}–{slot.endTime}
                  {slot.room ? ` · ${slot.room}` : ''}
                  {slot.teacherName ? ` · ${slot.teacherName}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Students ({studentsLoading ? '…' : students.length})
        </Text>
      </View>
    </>
  );

  return (
    <FlatList
      style={styles.screen}
      data={students}
      keyExtractor={(s) => s.id}
      renderItem={renderStudent}
      ListHeaderComponent={header}
      ListEmptyComponent={
        studentsLoading ? (
          <ActivityIndicator color={cs.color} style={{ marginTop: 24 }} />
        ) : (
          <EmptyState label="No students in this section" />
        )
      }
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  listScroll: { paddingHorizontal: 20, gap: 16 },
  searchWrap: { marginBottom: 4 },
  listContent: { paddingBottom: 40 },
  hero: { paddingHorizontal: 20, paddingBottom: 32 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroClass: { fontFamily: FontFamily.extraBold, fontSize: 28, color: Colors.white },
  heroSubject: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginBottom: 16,
  },
  heroMeta: { flexDirection: 'row', gap: 16 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { fontFamily: FontFamily.medium, fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  actionRows: { paddingHorizontal: 20, gap: 10, marginTop: -18, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 5,
    ...Shadows.pop,
  },
  actionCardSpacer: { flex: 1 },
  actionLabel: { fontFamily: FontFamily.semiBold, fontSize: 10, color: Colors.ink3 },
  timetablePreview: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 14,
    gap: 8,
    ...Shadows.card,
  },
  timetablePreviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timetablePreviewTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.ink },
  timetablePreviewLink: { fontFamily: FontFamily.semiBold, fontSize: 12 },
  timetableEmpty: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  timetableSlotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  timetablePeriod: { fontFamily: FontFamily.bold, fontSize: 12, width: 26 },
  timetableSubject: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink },
  timetableMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  sectionHeader: { paddingHorizontal: 20, marginTop: 18, marginBottom: 12 },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.ink },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    ...Shadows.card,
  },
  studentRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentInfo: { flex: 1, marginLeft: 12 },
  studentName: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.ink },
  studentRoll: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  studentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attBadge: { borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  attText: { fontFamily: FontFamily.bold, fontSize: 12 },
});
