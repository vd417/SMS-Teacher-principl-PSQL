import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { deriveGradeColorSet, attendancePctColor } from '@/theme/derive';
import { gradeLabel } from '@/lib/classLabel';

export interface AttendanceGradeCardProps {
  gradeName: string;
  sectionCount: number;
  present: number;
  total: number;
  pct: number | null;
  summaryLoading?: boolean;
  /** attendance = present/total summary; picker = section count only */
  mode?: 'attendance' | 'picker';
  onPress: () => void;
}

export const AttendanceGradeCard: React.FC<AttendanceGradeCardProps> = ({
  gradeName,
  sectionCount,
  present,
  total,
  pct,
  summaryLoading,
  mode = 'attendance',
  onPress,
}) => {
  const cs = deriveGradeColorSet(gradeName);
  const hasStudents = total > 0;
  const pctColor = attendancePctColor(pct, hasStudents);
  const isPicker = mode === 'picker';

  const summaryText = isPicker
    ? `${sectionCount} section${sectionCount === 1 ? '' : 's'}`
    : summaryLoading
      ? '…'
      : !hasStudents
        ? 'No students'
        : `Present ${present}/${total}`;

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: cs.color }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.top}>
        <View style={[styles.gradeBadge, { backgroundColor: cs.color }]}>
          <Text style={styles.gradeBadgeText} numberOfLines={2}>
            {gradeLabel(gradeName)}
          </Text>
        </View>
        <View style={[styles.sectionChip, { backgroundColor: cs.colorSoft }]}>
          <Text style={[styles.sectionChipText, { color: cs.color }]}>
            {sectionCount} sec{sectionCount > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <Text style={styles.summary} numberOfLines={1}>
          {summaryText}
        </Text>
        {!isPicker && !summaryLoading && hasStudents && pct !== null ? (
          <View style={[styles.pctBadge, { backgroundColor: `${pctColor}18` }]}>
            <View style={[styles.pctDot, { backgroundColor: pctColor }]} />
            <Text style={[styles.pctText, { color: pctColor }]}>{pct}%</Text>
          </View>
        ) : (
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={18} color={cs.color} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    borderLeftWidth: 5,
    padding: 16,
    gap: 12,
    ...Shadows.card,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  gradeBadge: {
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
  },
  gradeBadgeText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.white,
  },
  sectionChip: {
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  sectionChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summary: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.inkMuted,
    flex: 1,
  },
  pctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pctDot: {
    width: 7,
    height: 7,
    borderRadius: Radii.full,
  },
  pctText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    backgroundColor: Colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
