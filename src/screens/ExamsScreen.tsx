import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill } from '../components';
import { exams } from '../data';
import type { ExamStatus } from '../types';
import type { HomeStackParamList } from '../navigation/types';

type ExamsNav = NativeStackNavigationProp<HomeStackParamList, 'ExamsScreen'>;

const FILTERS: { label: string; value: ExamStatus | 'all' }[] = [
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
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ExamStatus | 'all'>('all');

  const filtered = filter === 'all' ? exams : exams.filter((e) => e.status === filter);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader
          title="Exams"
          subtitle={`${exams.length} total`}
          showBack
          rightComponent={
            <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate('ExamNew')}>
              <Ionicons name="add" size={18} color={Colors.white} />
              <Text style={styles.newBtnText}>New</Text>
            </TouchableOpacity>
          }
        />
      </Animated.View>

      {/* Filters */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.filterLabel, filter === f.value && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {filtered.map((exam, i) => (
        <Animated.View key={exam.id} entering={FadeInDown.delay(140 + i * 60).springify()}>
          <TouchableOpacity
            style={styles.examCard}
            onPress={() => navigation.navigate('ExamDetail', { examId: exam.id })}
            activeOpacity={0.85}
          >
            <View style={[styles.examColorBar, { backgroundColor: exam.color }]} />
            <View style={styles.examContent}>
              <View style={styles.examHeader}>
                <Text style={styles.examTitle} numberOfLines={1}>
                  {exam.title}
                </Text>
                <Pill
                  label={STATUS_LABELS[exam.status]}
                  color={STATUS_COLORS[exam.status]}
                  backgroundColor={STATUS_SOFT[exam.status]}
                  size="sm"
                />
              </View>
              <Text style={styles.examClass}>
                {exam.className} · {exam.subject}
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
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
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
