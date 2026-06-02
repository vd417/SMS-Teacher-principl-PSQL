import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast, PunchButton } from '../components';
import { todayISO } from '@/lib/geofence';
import { isAppError } from '@/lib/errors';
import {
  useMyAttendanceToday,
  useMyAttendanceHistory,
  useMyAttendanceSummary,
  usePunch,
} from '@/features/teacherAttendance/hooks';
import type { CheckEvent, TeacherAttendanceDay } from '@/data/domain';

const timeOf = (e?: CheckEvent) =>
  e ? new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const dayFlagged = (d: TeacherAttendanceDay) =>
  d.checkIn?.verified === false || d.checkOut?.verified === false;

export const MyAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const month = todayISO().slice(0, 7);

  const { data: today, isLoading: todayLoading } = useMyAttendanceToday();
  const { data: history = [], isLoading: historyLoading } = useMyAttendanceHistory();
  const { data: summary } = useMyAttendanceSummary(month);
  const punch = usePunch();

  const [toast, setToast] = React.useState<{
    msg: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const canCheckIn = !today?.checkIn;
  const canCheckOut = !!today?.checkIn && !today?.checkOut;
  const latestPunch = today?.checkOut ?? today?.checkIn;

  const doPunch = (kind: 'in' | 'out') => {
    punch.mutate(kind, {
      onSuccess: (day) => {
        const ev = kind === 'in' ? day.checkIn : day.checkOut;
        const meters = ev ? Math.round(ev.distanceMeters) : 0;
        setToast({
          msg: ev?.verified
            ? `Checked ${kind} — ${meters} m from school ✓`
            : `Checked ${kind} — ${meters} m away, location flagged`,
          type: ev?.verified ? 'success' : 'warning',
        });
      },
      onError: (e) => {
        const msg = isAppError(e) ? e.message : 'Something went wrong. Please try again.';
        setToast({ msg, type: 'error' });
      },
    });
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader title="My Attendance" subtitle="Your daily check-in" showBack />
        </Animated.View>

        {/* Today */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
          <Text style={styles.cardTitle}>Today</Text>
          {todayLoading ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <>
              <View style={styles.timeRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Check In</Text>
                  <Text style={styles.timeValue}>{timeOf(today?.checkIn)}</Text>
                </View>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>Check Out</Text>
                  <Text style={styles.timeValue}>{timeOf(today?.checkOut)}</Text>
                </View>
              </View>
              {latestPunch && (
                <View style={styles.distanceHint}>
                  <Ionicons name="location" size={12} color={Colors.inkMuted} />
                  <Text style={styles.distanceText}>
                    {Math.round(latestPunch.distanceMeters)} m from school
                  </Text>
                </View>
              )}
              {today && dayFlagged(today) && (
                <View style={styles.flagBadge}>
                  <Ionicons name="warning-outline" size={13} color={Colors.absent} />
                  <Text style={styles.flagText}>Unverified location</Text>
                </View>
              )}
              <View style={styles.actions}>
                <PunchButton
                  label="Check In"
                  icon="enter-outline"
                  onPress={() => doPunch('in')}
                  disabled={!canCheckIn || punch.isPending}
                  loading={punch.isPending && punch.variables === 'in'}
                  style={styles.actionBtn}
                />
                <PunchButton
                  label="Check Out"
                  icon="exit-outline"
                  onPress={() => doPunch('out')}
                  disabled={!canCheckOut || punch.isPending}
                  loading={punch.isPending && punch.variables === 'out'}
                  style={styles.actionBtn}
                />
              </View>
            </>
          )}
        </Animated.View>

        {/* Monthly summary */}
        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.summaryRow}>
          {[
            { label: 'Present', value: String(summary?.daysPresent ?? '–') },
            { label: 'Flagged', value: String(summary?.daysFlagged ?? '–') },
            { label: 'Hours', value: String(summary?.totalHours ?? '–') },
          ].map((s) => (
            <View key={s.label} style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{s.value}</Text>
              <Text style={styles.summaryLbl}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent</Text>
        {historyLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          history.map((d, i) => (
            <Animated.View
              key={d.date}
              entering={FadeInDown.delay(200 + i * 30).springify()}
              style={styles.historyRow}
            >
              <Text style={styles.historyDate}>{d.date}</Text>
              <Text style={styles.historyTimes}>
                {timeOf(d.checkIn)} – {timeOf(d.checkOut)}
              </Text>
              {dayFlagged(d) && <Ionicons name="warning-outline" size={14} color={Colors.absent} />}
            </Animated.View>
          ))
        )}
      </ScrollView>

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
  scroll: { paddingHorizontal: 20, gap: 14 },
  card: { backgroundColor: Colors.card, borderRadius: Radii.md, padding: 16, ...Shadows.card },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: 12 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeBox: {
    flex: 1,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  timeLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted },
  timeValue: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.primary,
    marginTop: 2,
  },
  distanceHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  distanceText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  flagText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.absent },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryItem: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...Shadows.card,
  },
  summaryNum: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  summaryLbl: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginTop: 4 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    ...Shadows.card,
  },
  historyDate: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink, flex: 1 },
  historyTimes: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
});
