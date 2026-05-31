import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useExams } from '../features/exams/hooks';
import { useGradesByExam } from '../features/grades/hooks';
import { deriveColorSet } from '../theme/derive';

export const GradesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const { data: exams = [], isLoading: examsLoading } = useExams();
  const completedExams = exams.filter((e) => e.status === 'completed');

  const [selectedExam, setSelectedExam] = useState<string>('');

  // Default to first completed exam once data loads
  const effectiveExamId = selectedExam || completedExams[0]?.id || '';

  const { data: examGrades = [], isLoading: gradesLoading } = useGradesByExam(effectiveExamId);

  const exam = exams.find((e) => e.id === effectiveExamId);
  const { color, colorSoft } = exam
    ? deriveColorSet(exam.id)
    : { color: Colors.primary, colorSoft: Colors.primarySoft };

  const avg =
    examGrades.length > 0
      ? Math.round(
          examGrades.reduce((sum, g) => sum + (g.marks / g.maxMarks) * 100, 0) / examGrades.length
        )
      : 0;

  const isLoading = examsLoading || gradesLoading;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Grades" subtitle="Exam results" showBack />
      </Animated.View>

      {/* Exam Picker */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.examPicker}
          contentContainerStyle={styles.examPickerContent}
        >
          {completedExams.map((e) => {
            const { color: eColor } = deriveColorSet(e.id);
            const isSelected = effectiveExamId === e.id;
            return (
              <TouchableOpacity
                key={e.id}
                style={[
                  styles.examChip,
                  isSelected && { backgroundColor: eColor, borderColor: eColor },
                ]}
                onPress={() => setSelectedExam(e.id)}
              >
                <Text
                  style={[styles.examChipText, isSelected && { color: Colors.white }]}
                  numberOfLines={1}
                >
                  {e.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      {isLoading && (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {!isLoading && !exam && completedExams.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No completed exams yet.</Text>
        </View>
      )}

      {!isLoading && exam && (
        <>
          {/* Summary */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.summaryCard}>
            <View style={[styles.summaryLeft, { backgroundColor: colorSoft }]}>
              <Text style={[styles.summaryAvg, { color }]}>{avg}%</Text>
              <Text style={[styles.summaryLabel, { color }]}>Class Average</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryTitle}>{exam.title}</Text>
              <Text style={styles.summaryClass}>{exam.className}</Text>
              <Text style={styles.summaryMeta}>
                {examGrades.length} results · Max {exam.maxMarks} marks
              </Text>
            </View>
          </Animated.View>

          {/* Grade List */}
          {examGrades.length > 0 ? (
            examGrades.map((g, i) => (
              <Animated.View
                key={g.studentId}
                entering={FadeInDown.delay(200 + i * 40).springify()}
              >
                <View style={styles.gradeRow}>
                  <View style={styles.gradeRank}>
                    <Text style={styles.gradeRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.gradeInfo}>
                    <Text style={styles.gradeStudentName}>{g.studentName}</Text>
                    <Text style={styles.gradeScore}>
                      {g.marks}/{g.maxMarks} marks
                    </Text>
                  </View>
                  <View style={[styles.gradePill, { backgroundColor: colorSoft }]}>
                    <Text style={[styles.gradePillText, { color }]}>{g.grade}</Text>
                  </View>
                  <Text style={styles.gradePct}>{Math.round((g.marks / g.maxMarks) * 100)}%</Text>
                </View>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No results yet for this exam.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  centered: { paddingVertical: 40, alignItems: 'center' },
  examPicker: { marginBottom: 4 },
  examPickerContent: { gap: 8, paddingRight: 8 },
  examChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.rule,
    backgroundColor: Colors.card,
    maxWidth: 200,
  },
  examChipText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  summaryLeft: {
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  summaryAvg: { fontFamily: FontFamily.extraBold, fontSize: 26 },
  summaryLabel: { fontFamily: FontFamily.medium, fontSize: 12, marginTop: 4 },
  summaryRight: { flex: 1, padding: 16, justifyContent: 'center' },
  summaryTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  summaryClass: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 3,
  },
  summaryMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkSoft,
    marginTop: 3,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    ...Shadows.card,
  },
  gradeRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gradeRankText: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.primary },
  gradeInfo: { flex: 1 },
  gradeStudentName: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.ink },
  gradeScore: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  gradePill: {
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 10,
  },
  gradePillText: { fontFamily: FontFamily.bold, fontSize: 14 },
  gradePct: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.ink,
    minWidth: 44,
    textAlign: 'right',
  },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
});
