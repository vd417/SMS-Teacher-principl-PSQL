import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useTimetable } from '@/features/timetable/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import type { WeekDay } from '../types';

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_LABELS: Record<WeekDay, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
};

const { width } = Dimensions.get('window');
const SLOT_WIDTH = (width - 40 - 12) / 2;

export const ScheduleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeDay, setActiveDay] = useState<WeekDay>('Mon');
  const { data: timetable = [], isLoading, isError, refetch } = useTimetable();

  const daySlots = timetable.filter((t) => t.day === activeDay);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Schedule" subtitle={DAY_LABELS[activeDay]} />
      </Animated.View>

      {/* Day Picker */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayPicker}
          contentContainerStyle={styles.dayPickerContent}
        >
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, activeDay === day && styles.dayChipActive]}
              onPress={() => setActiveDay(day)}
            >
              <Text style={[styles.dayLabel, activeDay === day && styles.dayLabelActive]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {isLoading ? (
        <View style={styles.slotsGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={140} width={SLOT_WIDTH} radius={16} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : daySlots.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyTitle}>Free Day!</Text>
          <Text style={styles.emptySubtitle}>No classes scheduled for {DAY_LABELS[activeDay]}</Text>
        </Animated.View>
      ) : (
        <View style={styles.slotsGrid}>
          {daySlots.map((slot, i) => {
            const cs = deriveColorSet(slot.classId);
            return (
              <Animated.View
                key={slot.id}
                entering={FadeInDown.delay(160 + i * 60).springify()}
                style={[styles.slotCard, { backgroundColor: cs.color, width: SLOT_WIDTH }]}
              >
                <View style={styles.slotPeriod}>
                  <Text style={styles.slotPeriodText}>P{slot.period}</Text>
                </View>
                <Text style={styles.slotTime}>
                  {slot.startTime} – {slot.endTime}
                </Text>
                <Text style={styles.slotSubject}>{slot.subject}</Text>
                <Text style={styles.slotClass}>{slot.className}</Text>
                <View style={styles.slotRoomBadge}>
                  <Text style={[styles.slotRoomText, { color: cs.color }]}>{slot.room}</Text>
                </View>
              </Animated.View>
            );
          })}
        </View>
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
  },
  dayPicker: {
    marginVertical: 20,
  },
  dayPickerContent: {
    gap: 10,
    paddingRight: 8,
  },
  dayChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.card,
    ...Shadows.card,
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
  },
  dayLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.inkMuted,
  },
  dayLabelActive: {
    color: Colors.white,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotCard: {
    borderRadius: Radii.xl,
    padding: 16,
    ...Shadows.card,
  },
  slotPeriod: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  slotPeriodText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  slotTime: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  slotSubject: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: Colors.white,
    marginBottom: 4,
  },
  slotClass: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  slotRoomBadge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  slotRoomText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    color: Colors.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
  },
});
