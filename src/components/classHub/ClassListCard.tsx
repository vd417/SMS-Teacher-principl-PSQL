import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { useAttendance } from '@/features/attendance/hooks';
import { classCardColorSet } from '@/theme/derive';
import { classLabel } from '@/lib/classLabel';
import type { Class } from '@/data/domain';

export interface ClassListCardProps {
  cls: Class;
  index: number;
  today: string;
  onOpenClass: () => void;
  onOpenAttendance: () => void;
  homeworkCount?: number;
  examCount?: number;
  /** Overrides `cls.subject` with the signed-in teacher's own subject(s) for this class (A-1). */
  subject?: string;
}

export const ClassListCard: React.FC<ClassListCardProps> = ({
  cls,
  index,
  today,
  onOpenClass,
  onOpenAttendance,
  homeworkCount,
  examCount,
  subject,
}) => {
  const cs = classCardColorSet(cls.id);
  const { data: attendanceRecords } = useAttendance(cls.id, today);
  const markedToday = !!attendanceRecords?.length;

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 50).springify()}>
      <View style={[styles.card, { backgroundColor: cs.color }]}>
        <TouchableOpacity onPress={onOpenClass} activeOpacity={0.88}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.className}>{classLabel(cls.name, cls.section, ' – ')}</Text>
              <Text style={styles.subject}>{subject ?? cls.subject}</Text>
            </View>
            <View style={styles.iconBadge}>
              <Ionicons name="school" size={22} color={cs.color} />
            </View>
          </View>

          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.85)" />
              <Text style={styles.metaText}>{cls.studentCount} Students</Text>
            </View>
            {cls.room ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText}>{cls.room}</Text>
              </View>
            ) : null}
            {cls.nextPeriod ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText}>{cls.nextPeriod}</Text>
              </View>
            ) : null}
            {markedToday ? (
              <View style={styles.metaItem}>
                <Ionicons name="checkmark-circle" size={14} color="rgba(255,255,255,0.95)" />
                <Text style={styles.metaText}>Marked today</Text>
              </View>
            ) : null}
            {homeworkCount != null && homeworkCount > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="book-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText}>{homeworkCount} HW</Text>
              </View>
            ) : null}
            {examCount != null && examCount > 0 ? (
              <View style={styles.metaItem}>
                <Ionicons name="document-text-outline" size={14} color="rgba(255,255,255,0.85)" />
                <Text style={styles.metaText}>{examCount} tests</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onOpenAttendance}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={14} color={cs.color} />
            <Text style={[styles.actionText, { color: cs.color }]}>Attendance</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={onOpenClass} activeOpacity={0.85}>
            <Ionicons name="people" size={14} color={cs.color} />
            <Text style={[styles.actionText, { color: cs.color }]}>Students</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.xl,
    padding: 20,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  className: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.white,
  },
  subject: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 4,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
  },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: { fontFamily: FontFamily.semiBold, fontSize: 13 },
});
