import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill } from '../components';
import { useAssignments } from '@/features/assignments/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import type { AssignmentStatus } from '../types';

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
  const [filter, setFilter] = useState<AssignmentStatus | 'all'>('all');
  const { data: assignments = [], isLoading, isError, refetch } = useAssignments();

  const filtered = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter);

  const FILTERS: { label: string; value: AssignmentStatus | 'all' }[] = [
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
        <ScreenHeader title="Assignments" subtitle={`${assignments.length} total`} showBack />
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

      {isLoading ? (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={110} radius={12} />
          ))}
        </>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState label="No assignments found" />
      ) : (
        filtered.map((asgn, i) => {
          const cs = deriveColorSet(asgn.id);
          const submittedPct = Math.round((asgn.submissionsCount / asgn.totalStudents) * 100);
          return (
            <Animated.View key={asgn.id} entering={FadeInDown.delay(140 + i * 60).springify()}>
              <View style={styles.asgnCard}>
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
                    {asgn.className} · {asgn.subject}
                  </Text>
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

                  {/* Progress bar */}
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${submittedPct}%` as any,
                          backgroundColor: cs.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressLabel, { color: cs.color }]}>
                    {submittedPct}% submitted
                  </Text>
                </View>
              </View>
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
