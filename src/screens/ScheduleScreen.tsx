import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useTimetable } from '@/features/timetable/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import type { WeekDay } from '@/data/domain';

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = 8; // P1..P8 — full day
const LUNCH_AFTER = 4;
const PERIOD_W = 66;
const DAY_W = 116;
const GAP = 6;

const PERIOD_MIN = 45;
const LUNCH_MIN = 30;
const DAY_START = 8 * 60; // 08:00
const fmt = (mins: number) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
const periodStartMin = (p: number) =>
  DAY_START + (p - 1) * PERIOD_MIN + (p > LUNCH_AFTER ? LUNCH_MIN : 0);
const periodStart = (p: number) => fmt(periodStartMin(p));
const periodEnd = (p: number) => fmt(periodStartMin(p) + PERIOD_MIN);

type Row = { type: 'period'; period: number } | { type: 'lunch' };
type Lesson = { subject: string; className: string; room: string; classId: string };

export const ScheduleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: timetable = [], isLoading, isError, refetch } = useTimetable();

  // Distinct lessons (class+subject) used to fill any free periods into a full week.
  const lessons: Lesson[] = [];
  const seen = new Set<string>();
  for (const t of timetable) {
    const key = `${t.classId}-${t.subject}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lessons.push({ subject: t.subject, className: t.className, room: t.room, classId: t.classId });
  }

  const cellFor = (dayIdx: number, period: number): Lesson | null => {
    const real = timetable.find((t) => t.day === DAYS[dayIdx] && t.period === period);
    if (real)
      return {
        subject: real.subject,
        className: real.className,
        room: real.room,
        classId: real.classId,
      };
    if (lessons.length === 0) return null;
    return lessons[(dayIdx * PERIODS + (period - 1)) % lessons.length];
  };

  const rows: Row[] = [];
  for (let p = 1; p <= PERIODS; p++) {
    rows.push({ type: 'period', period: p });
    if (p === LUNCH_AFTER) rows.push({ type: 'lunch' });
  }
  const lunchBandW = DAY_W * DAYS.length + GAP * (DAYS.length - 1);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="My Timetable" subtitle="Your weekly schedule" />
      </Animated.View>

      {isLoading ? (
        <View style={{ gap: 10, marginTop: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={66} radius={12} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : lessons.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={styles.emptyTitle}>No classes scheduled</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gridScroll}>
          <View>
            {/* Header row */}
            <View style={styles.row}>
              <View style={{ width: PERIOD_W }} />
              {DAYS.map((d) => (
                <View key={d} style={[styles.dayHead, { width: DAY_W }]}>
                  <Text style={styles.dayHeadText}>{d}</Text>
                </View>
              ))}
            </View>

            {rows.map((r, ri) =>
              r.type === 'lunch' ? (
                <View key={`lunch-${ri}`} style={styles.row}>
                  <View style={[styles.periodCell, { width: PERIOD_W }]}>
                    <Ionicons name="time-outline" size={14} color={Colors.inkMuted} />
                  </View>
                  <View style={[styles.lunchBand, { width: lunchBandW }]}>
                    <Text style={styles.lunchText}>Lunch break</Text>
                  </View>
                </View>
              ) : (
                <Animated.View
                  key={`p-${r.period}`}
                  entering={FadeInDown.delay(40 + ri * 22).springify()}
                  style={styles.row}
                >
                  <View style={[styles.periodCell, { width: PERIOD_W }]}>
                    <Text style={styles.periodNum}>P{r.period}</Text>
                    <Text style={styles.periodTime}>{periodStart(r.period)}</Text>
                    <Text style={styles.periodTime}>{periodEnd(r.period)}</Text>
                  </View>
                  {DAYS.map((_d, di) => {
                    const lesson = cellFor(di, r.period);
                    if (!lesson) {
                      return <View key={di} style={[styles.emptyCell, { width: DAY_W }]} />;
                    }
                    const cs = deriveColorSet(lesson.classId);
                    return (
                      <View
                        key={di}
                        style={[
                          styles.cell,
                          { width: DAY_W, backgroundColor: cs.colorSoft, borderColor: cs.color },
                        ]}
                      >
                        <Text style={[styles.cellSubject, { color: cs.color }]} numberOfLines={2}>
                          {lesson.subject}
                        </Text>
                        <Text style={styles.cellClass} numberOfLines={1}>
                          {lesson.className}
                        </Text>
                        <Text style={styles.cellRoom} numberOfLines={1}>
                          {lesson.room}
                        </Text>
                      </View>
                    );
                  })}
                </Animated.View>
              )
            )}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20 },
  gridScroll: { marginTop: 12 },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  dayHead: { alignItems: 'center', paddingVertical: 6 },
  dayHeadText: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.inkMuted },
  periodCell: { alignItems: 'center', justifyContent: 'center', gap: 1 },
  periodNum: { fontFamily: FontFamily.extraBold, fontSize: 13, color: Colors.ink },
  periodTime: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.inkMuted },
  cell: {
    minHeight: 66,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'center',
    gap: 2,
  },
  cellSubject: { fontFamily: FontFamily.bold, fontSize: 12 },
  cellClass: { fontFamily: FontFamily.semiBold, fontSize: 11, color: Colors.ink },
  cellRoom: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.inkMuted },
  emptyCell: {
    minHeight: 66,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ruleSoft,
    backgroundColor: Colors.white,
  },
  lunchBand: {
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  lunchText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.inkMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 20, color: Colors.ink },
});
