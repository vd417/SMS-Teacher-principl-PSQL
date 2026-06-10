import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, ScreenHeader, Toast } from '../components';
import { useExam } from '../features/exams/hooks';
import { useStudentsByClass } from '@/features/students/hooks';
import { useGradesByExam, useUpsertGrade } from '@/features/grades/hooks';
import { deriveColorSet } from '@/theme/derive';
import type { HomeStackParamList } from '../navigation/types';

type MarksRoute = RouteProp<HomeStackParamList, 'MarksEntryScreen'>;

const letterFor = (pct: number) =>
  pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';

export const MarksEntryScreen: React.FC = () => {
  const route = useRoute<MarksRoute>();
  const insets = useSafeAreaInsets();
  const { examId } = route.params;

  const { data: exam, isLoading: examLoading } = useExam(examId);
  const { data: students = [], isLoading: studentsLoading } = useStudentsByClass(
    exam?.classId ?? ''
  );
  const { data: grades = [] } = useGradesByExam(examId);
  const upsert = useUpsertGrade(examId);

  const maxMarks = exam?.maxMarks ?? 100;
  const cs = deriveColorSet(exam?.id ?? examId);

  const [marks, setMarks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Seed local inputs from any already-saved grades.
  useEffect(() => {
    if (grades.length === 0) return;
    setMarks((prev) => {
      const next = { ...prev };
      for (const g of grades) if (next[g.studentId] == null) next[g.studentId] = String(g.marks);
      return next;
    });
  }, [grades]);

  const setMark = (studentId: string, raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setMarks((prev) => ({ ...prev, [studentId]: digits }));
  };

  const enteredCount = students.filter((s) => (marks[s.id] ?? '').trim() !== '').length;

  const handleSubmit = async () => {
    const toSave = students.filter((s) => (marks[s.id] ?? '').trim() !== '');
    for (const s of toSave) {
      const v = Number(marks[s.id]);
      if (Number.isNaN(v) || v < 0 || v > maxMarks) {
        setToast({ msg: `${s.name}: marks must be 0–${maxMarks}`, type: 'error' });
        return;
      }
    }
    setSubmitting(true);
    try {
      await Promise.all(
        toSave.map((s) =>
          upsert.mutateAsync({ studentId: s.id, examId, marks: Number(marks[s.id]) })
        )
      );
      setToast({
        msg: `Saved marks for ${toSave.length} student${toSave.length === 1 ? '' : 's'}`,
        type: 'success',
      });
    } catch {
      setToast({ msg: 'Could not save marks. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = examLoading || studentsLoading;

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!exam) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.errorText}>Exam not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title={`${exam.className} · ${exam.subject}`}
            subtitle={`${exam.title} · out of ${maxMarks}`}
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.summary}>
          <View style={[styles.summaryPill, { backgroundColor: cs.colorSoft }]}>
            <Text style={[styles.summaryNum, { color: cs.color }]}>{enteredCount}</Text>
            <Text style={[styles.summaryLbl, { color: cs.color }]}>Entered</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryNum}>{students.length}</Text>
            <Text style={styles.summaryLbl}>Students</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryNum}>{maxMarks}</Text>
            <Text style={styles.summaryLbl}>Max marks</Text>
          </View>
        </Animated.View>

        {students.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.errorText}>No students in this class</Text>
          </View>
        )}

        {students.map((student, i) => {
          const val = marks[student.id] ?? '';
          const num = Number(val);
          const valid = val === '' || (!Number.isNaN(num) && num >= 0 && num <= maxMarks);
          const pct = val !== '' && valid ? Math.round((num / maxMarks) * 100) : null;
          return (
            <Animated.View key={student.id} entering={FadeInDown.delay(140 + i * 25).springify()}>
              <View style={styles.row}>
                <Avatar initials={student.initials} size={42} backgroundColor={cs.color} />
                <View style={styles.info}>
                  <Text style={styles.name}>{student.name}</Text>
                  <Text style={styles.roll}>Roll #{student.roll}</Text>
                </View>
                {pct != null && (
                  <View style={[styles.gradeBadge, { backgroundColor: cs.colorSoft }]}>
                    <Text style={[styles.gradeText, { color: cs.color }]}>{letterFor(pct)}</Text>
                  </View>
                )}
                <View style={styles.markWrap}>
                  <TextInput
                    style={[styles.input, !valid && styles.inputError]}
                    value={val}
                    onChangeText={(t) => setMark(student.id, t)}
                    keyboardType="number-pad"
                    placeholder="—"
                    placeholderTextColor={Colors.inkSoft}
                    maxLength={3}
                  />
                  <Text style={styles.outOf}>/{maxMarks}</Text>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      <View style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: cs.color }]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting || enteredCount === 0}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.fabText}>Save Marks</Text>
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{enteredCount}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Toast
        visible={!!toast}
        message={toast?.msg ?? ''}
        type={toast?.type ?? 'success'}
        onHide={() => setToast(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  summary: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  summaryPill: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    ...Shadows.card,
  },
  summaryNum: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  summaryLbl: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.inkMuted, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 12,
    gap: 12,
    ...Shadows.card,
  },
  info: { flex: 1 },
  name: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.ink },
  roll: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  gradeBadge: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.full,
    alignItems: 'center',
  },
  gradeText: { fontFamily: FontFamily.bold, fontSize: 13 },
  markWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  input: {
    width: 52,
    height: 42,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.ruleSoft,
    backgroundColor: Colors.paper,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
  },
  inputError: { borderColor: Colors.absent },
  outOf: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted },
  fab: { position: 'absolute', left: 24, right: 24 },
  fabBtn: {
    borderRadius: Radii.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.pop,
  },
  fabText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
  fabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radii.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fabBadgeText: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.white },
});
