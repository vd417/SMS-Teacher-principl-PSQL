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
import { useCalendar } from '@/features/calendar/hooks';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import type { CalendarStackParamList } from '../navigation/types';
import type { EventType } from '@/data/domain';

type CalendarNav = NativeStackNavigationProp<CalendarStackParamList, 'CalendarScreen'>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const TYPE_COLORS: Record<EventType, string> = {
  exam: Colors.coral,
  holiday: Colors.present,
  meeting: Colors.blue,
  event: Colors.teal,
  deadline: Colors.late,
};
const TYPE_SOFT: Record<EventType, string> = {
  exam: Colors.coralSoft,
  holiday: Colors.presentSoft,
  meeting: Colors.blueSoft,
  event: Colors.tealSoft,
  deadline: Colors.lateSoft,
};

export const CalendarScreen: React.FC = () => {
  const navigation = useNavigation<CalendarNav>();
  const insets = useSafeAreaInsets();
  const { data: calendarEvents = [], isLoading, isError, refetch } = useCalendar();

  const [selectedMonth, setSelectedMonth] = useState(4); // May (0-indexed)
  const [selectedYear] = useState(2026);

  const monthEvents = calendarEvents.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  // Build calendar grid (simplified)
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  const eventDays = new Set(monthEvents.map((e) => new Date(e.date).getDate()));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader
          title="Calendar"
          subtitle={`${MONTHS[selectedMonth]} ${selectedYear}`}
          rightComponent={
            <TouchableOpacity
              style={styles.scheduleBtn}
              onPress={() => navigation.navigate('ScheduleScreen')}
            >
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <Text style={styles.scheduleBtnText}>Schedule</Text>
            </TouchableOpacity>
          }
        />
      </Animated.View>

      {/* Month Picker */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.monthPicker}
          contentContainerStyle={styles.monthPickerContent}
        >
          {MONTHS.map((m, idx) => (
            <TouchableOpacity
              key={m}
              style={[styles.monthChip, selectedMonth === idx && styles.monthChipActive]}
              onPress={() => setSelectedMonth(idx)}
            >
              <Text style={[styles.monthLabel, selectedMonth === idx && styles.monthLabelActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {isLoading ? (
        <>
          <Skeleton height={220} radius={16} />
          <Skeleton height={60} radius={12} />
          <Skeleton height={60} radius={12} />
        </>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <>
          {/* Mini Calendar */}
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.calendarCard}>
            <View style={styles.dayHeaders}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={styles.dayHeader}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {cells.map((day, i) => (
                <View key={i} style={styles.cell}>
                  {day ? (
                    <View style={[styles.dayCell, eventDays.has(day) && styles.dayCellEvent]}>
                      <Text style={[styles.dayNum, eventDays.has(day) && styles.dayNumEvent]}>
                        {day}
                      </Text>
                      {eventDays.has(day) && <View style={styles.eventDot} />}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Events */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <Text style={styles.sectionTitle}>
              {monthEvents.length} events in {MONTHS[selectedMonth]}
            </Text>
          </Animated.View>

          {monthEvents.length === 0 ? (
            <EmptyState label={`No events in ${MONTHS[selectedMonth]}`} />
          ) : (
            monthEvents.map((event, i) => {
              const color = TYPE_COLORS[event.type];
              return (
                <Animated.View key={event.id} entering={FadeInDown.delay(240 + i * 50).springify()}>
                  <View style={styles.eventCard}>
                    <View style={[styles.eventColorBar, { backgroundColor: color }]} />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <View style={styles.eventMeta}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.inkMuted} />
                        <Text style={styles.eventMetaText}>{event.date}</Text>
                        {event.time && (
                          <>
                            <Ionicons name="time-outline" size={13} color={Colors.inkMuted} />
                            <Text style={styles.eventMetaText}>{event.time}</Text>
                          </>
                        )}
                      </View>
                      {event.description && (
                        <Text style={styles.eventDesc}>{event.description}</Text>
                      )}
                    </View>
                    <Pill
                      label={event.type}
                      color={TYPE_COLORS[event.type]}
                      backgroundColor={TYPE_SOFT[event.type]}
                      size="sm"
                    />
                  </View>
                </Animated.View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  scheduleBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  monthPicker: { marginBottom: 4 },
  monthPickerContent: { gap: 8, paddingRight: 8 },
  monthChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.card,
    ...Shadows.card,
  },
  monthChipActive: { backgroundColor: Colors.primary },
  monthLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  monthLabelActive: { color: Colors.white },
  calendarCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: 16,
    ...Shadows.card,
  },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellEvent: { backgroundColor: Colors.primarySoft },
  dayNum: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.ink },
  dayNumEvent: { fontFamily: FontFamily.bold, color: Colors.primary },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.primary, marginTop: 1 },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
    gap: 12,
  },
  eventColorBar: { width: 5, alignSelf: 'stretch' },
  eventInfo: { flex: 1, paddingVertical: 12 },
  eventTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink, marginBottom: 4 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  eventMetaText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  eventDesc: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkSoft },
});
