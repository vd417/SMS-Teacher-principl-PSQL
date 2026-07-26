import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { ScreenHeader } from '../../components';
import { useClass } from '@/features/classes/hooks';
import { useTimetable } from '@/features/timetable/hooks';
import { deriveColorSet } from '@/theme/derive';
import { ErrorState } from '@/ui/state/ErrorState';
import type { WeekDay } from '@/data/domain';
import type { PrincipalTimetableStackParamList } from '../../navigation/types';

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = 8; // teaching periods per day (P1..P8)
const LUNCH_AFTER = 4; // lunch band shown after period 4
const PERIOD_W = 66;
const DAY_W = 112;
const GAP = 6;

const PERIOD_MIN = 45;
const LUNCH_MIN = 30;
const DAY_START = 8 * 60; // 08:00
const fmt = (mins: number) => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
const periodStartMin = (p: number) =>
  DAY_START + (p - 1) * PERIOD_MIN + (p > LUNCH_AFTER ? LUNCH_MIN : 0);
const periodStart = (p: number) => fmt(periodStartMin(p));
const periodEnd = (p: number) => fmt(periodStartMin(p) + PERIOD_MIN);

type ClassTimetableRoute = RouteProp<PrincipalTimetableStackParamList, 'ClassTimetableScreen'>;
type Row = { type: 'period'; period: number } | { type: 'lunch' };
type Lesson = { subject: string; room: string; teacherName: string };

export const ClassTimetableScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<ClassTimetableRoute>();
  const { classId } = route.params;

  const { data: cls } = useClass(classId);
  const { data: timetable = [], isLoading, isError, refetch } = useTimetable();

  // Real published slots for this class only.
  const classSlots = timetable.filter((t) => t.classId === classId);

  const lessonAt = (dayIdx: number, period: number): Lesson | null => {
    const slot = classSlots.find((t) => t.day === DAYS[dayIdx] && t.period === period);
    return slot ? { subject: slot.subject, room: slot.room, teacherName: slot.teacherName } : null;
  };

  const rows: Row[] = [];
  for (let p = 1; p <= PERIODS; p++) {
    rows.push({ type: 'period', period: p });
    if (p === LUNCH_AFTER) rows.push({ type: 'lunch' });
  }
  const lunchBandW = DAY_W * DAYS.length + GAP * (DAYS.length - 1);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title={cls ? `${cls.name} – ${cls.section}` : 'Timetable'}
            subtitle="Weekly schedule"
            showBack
          />
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : classSlots.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={44} color={Colors.inkMuted} />
            <Text style={styles.emptyText}>No timetable published for this class</Text>
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
                      const lesson = lessonAt(di, r.period);
                      if (!lesson) {
                        return <View key={di} style={[styles.emptyCell, { width: DAY_W }]} />;
                      }
                      const cs = deriveColorSet(lesson.subject);
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
                          {!!lesson.teacherName && (
                            <View style={styles.teacherRow}>
                              <Ionicons name="person" size={10} color={Colors.inkMuted} />
                              <Text style={styles.cellTeacher} numberOfLines={1}>
                                {lesson.teacherName}
                              </Text>
                            </View>
                          )}
                          {!!lesson.room && (
                            <Text style={styles.cellRoom} numberOfLines={1}>
                              {lesson.room}
                            </Text>
                          )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  gridScroll: { marginTop: 8 },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  dayHead: { alignItems: 'center', paddingVertical: 6 },
  dayHeadText: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.inkMuted },
  periodCell: { alignItems: 'center', justifyContent: 'center', gap: 1 },
  periodNum: { fontFamily: FontFamily.extraBold, fontSize: 13, color: Colors.ink },
  periodTime: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.inkMuted },
  cell: {
    minHeight: 62,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'center',
    gap: 3,
  },
  cellSubject: { fontFamily: FontFamily.bold, fontSize: 12 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cellTeacher: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.inkMuted, flex: 1 },
  cellRoom: { fontFamily: FontFamily.regular, fontSize: 10, color: Colors.inkMuted },
  emptyCell: {
    minHeight: 62,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.ruleSoft,
    backgroundColor: Colors.white,
  },
  lunchBand: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  lunchText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.inkMuted },
  empty: { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.inkMuted },
});
