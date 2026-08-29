import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast, PunchButton } from '../components';
import { todayISO, formatLongDate, formatTimeOfDay } from '@/lib/date';
import {
  formatPunchLabel,
  formatAttendanceHours,
  punchSuccessMessage,
  punchErrorMessage,
  OUTSIDE_SCHOOL_BADGE,
} from '@/lib/attendanceDisplay';
import { useAuth } from '@/features/auth/AuthProvider';
import { useSchoolClosedToday } from '@/features/calendar/hooks';
import { useMySchools } from '@/features/auth/useMySchools';
import {
  useMyAttendanceToday,
  useMyAttendanceHistory,
  useMyAttendanceSummary,
  usePunch,
  useSchoolLocation,
  useGeofenceAllowed,
  useStaffCheckInAllowed,
  GEO_CHECKIN_UPGRADE_MESSAGE,
} from '@/features/teacherAttendance/hooks';
import type { CheckEvent, TeacherAttendanceDay } from '@/data/domain';

const timeOf = (e?: CheckEvent) => formatTimeOfDay(e?.at);

const dayFlagged = (d: TeacherAttendanceDay, geo: boolean) =>
  geo && (d.checkIn?.verified === false || d.checkOut?.verified === false);

export const MyAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const month = todayISO().slice(0, 7);
  const { session } = useAuth();
  const { allowed: geofenceAllowed } = useGeofenceAllowed();
  const { allowed: staffCheckInAllowed } = useStaffCheckInAllowed();
  const schoolClosed = useSchoolClosedToday();
  const { data: mySchools = [] } = useMySchools();
  const multiSchool = mySchools.length > 1;

  const { data: today, isLoading: todayLoading } = useMyAttendanceToday();
  const { data: history = [], isLoading: historyLoading } = useMyAttendanceHistory();
  const { data: summary } = useMyAttendanceSummary(month);
  const { data: schoolLocation } = useSchoolLocation();
  const punch = usePunch();
  const schoolConfigured = schoolLocation != null;

  const [toast, setToast] = React.useState<{
    msg: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const canCheckIn = !today?.checkIn;
  const canCheckOut = !!today?.checkIn && !today?.checkOut;
  const latestPunch = today?.checkOut ?? today?.checkIn;

  const punchOpts = { geo: geofenceAllowed, schoolConfigured };

  const doPunch = (kind: 'in' | 'out') => {
    punch.mutate(kind, {
      onSuccess: (day) => {
        const ev = kind === 'in' ? day.checkIn : day.checkOut;
        const { msg, type } = punchSuccessMessage(kind, ev, punchOpts);
        setToast({ msg, type });
      },
      onError: (e) => {
        setToast({ msg: punchErrorMessage(e), type: 'error' });
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

        {!staffCheckInAllowed ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.upgradeCard}>
            <Ionicons name="location-outline" size={20} color={Colors.inkMuted} />
            <Text style={styles.upgradeText}>Staff check-in is not available on your plan.</Text>
          </Animated.View>
        ) : (
          <>
            {!geofenceAllowed && (
              <Animated.View
                entering={FadeInDown.delay(90).springify()}
                style={styles.manualBanner}
              >
                <Ionicons name="finger-print-outline" size={16} color={Colors.primary} />
                <Text style={styles.manualBannerText}>
                  Manual check-in on your plan. {GEO_CHECKIN_UPGRADE_MESSAGE}
                </Text>
              </Animated.View>
            )}
            {/* Today */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.card}>
              <Text style={styles.cardTitle}>Today</Text>
              {schoolClosed && (
                <View style={styles.closedHint}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.absent} />
                  <Text style={styles.closedHintText}>
                    School is closed today ({schoolClosed.title}). Check-in is disabled.
                  </Text>
                </View>
              )}
              {multiSchool && (
                <Text style={styles.multiSchoolHint}>
                  Check-in applies to {session?.tenant.name ?? 'this school'}. Switch school from
                  Profile to punch at another campus.
                </Text>
              )}
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
                  {latestPunch && geofenceAllowed && (
                    <View style={styles.distanceHint}>
                      <Ionicons name="location" size={12} color={Colors.inkMuted} />
                      <Text style={styles.distanceText}>
                        {formatPunchLabel(latestPunch, punchOpts)}
                      </Text>
                    </View>
                  )}
                  {geofenceAllowed && !schoolConfigured && (
                    <View style={styles.setupHint}>
                      <Ionicons
                        name="information-circle-outline"
                        size={13}
                        color={Colors.inkMuted}
                      />
                      <Text style={styles.setupHintText}>
                        Campus GPS is not configured. Ask your admin to set the school location
                        before you can check in.
                      </Text>
                    </View>
                  )}
                  {today && dayFlagged(today, geofenceAllowed) && (
                    <View style={styles.flagBadge}>
                      <Ionicons name="warning-outline" size={13} color={Colors.absent} />
                      <Text style={styles.flagText}>{OUTSIDE_SCHOOL_BADGE}</Text>
                    </View>
                  )}
                  <View style={styles.actions}>
                    <PunchButton
                      label="Check In"
                      icon="enter-outline"
                      onPress={() => doPunch('in')}
                      disabled={!canCheckIn || punch.isPending || !!schoolClosed}
                      loading={punch.isPending && punch.variables === 'in'}
                      style={styles.actionBtn}
                    />
                    <PunchButton
                      label="Check Out"
                      icon="exit-outline"
                      onPress={() => doPunch('out')}
                      disabled={!canCheckOut || punch.isPending || !!schoolClosed}
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
                { label: 'Hours', value: formatAttendanceHours(summary?.totalHours) },
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
                  <Text style={styles.historyDate}>{formatLongDate(d.date)}</Text>
                  <Text style={styles.historyTimes}>
                    {timeOf(d.checkIn)} – {timeOf(d.checkOut)}
                  </Text>
                  {dayFlagged(d, geofenceAllowed) && (
                    <Ionicons name="warning-outline" size={14} color={Colors.absent} />
                  )}
                </Animated.View>
              ))
            )}
          </>
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
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 16,
    ...Shadows.card,
  },
  upgradeText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    lineHeight: 20,
  },
  manualBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    padding: 12,
  },
  manualBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    lineHeight: 18,
  },
  card: { backgroundColor: Colors.card, borderRadius: Radii.md, padding: 16, ...Shadows.card },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: 12 },
  closedHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 10,
  },
  closedHintText: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.absent,
    lineHeight: 17,
  },
  multiSchoolHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    lineHeight: 17,
    marginBottom: 10,
  },
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
  distanceText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted, flex: 1 },
  setupHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    padding: 10,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
  },
  setupHintText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, flex: 1 },
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
