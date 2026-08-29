import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import {
  Avatar,
  Card,
  Donut,
  SectionHeader,
  SchoolClosedBanner,
  MoreFeaturesAvatar,
  HomeSchoolHeader,
  NotificationBell,
} from '../../components';
import { useAuth, useTenantId } from '@/features/auth/AuthProvider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { useCurrentSchoolBranding } from '@/features/auth/useCurrentSchoolBranding';
import { usePrincipalOverview } from '@/features/principal/hooks';
import { useApprovals } from '@/features/approvals/hooks';
import { useAnnouncements, useAppNotifications } from '@/features/announcements/hooks';
import { useSchoolClosedToday } from '@/features/calendar/hooks';
import { useFeature } from '@/features/plan/hooks';
import { staffCheckInStatus } from '@/lib/staffCheckIn';
import { staffDisplayLabel } from '@/lib/staffCategory';
import { navigateToMoreScreen } from '@/lib/navigateToMore';

const SHORTCUTS = [
  {
    key: 'AnnouncementsScreen',
    label: 'Broadcast',
    icon: 'megaphone-outline' as const,
    feature: 'communication',
  },
  {
    key: 'PrincipalTransportScreen',
    label: 'Live Bus',
    icon: 'bus-outline' as const,
    feature: 'transport',
  },
  {
    key: 'TeacherDirectoryScreen',
    label: 'Teachers',
    icon: 'people-outline' as const,
    feature: 'sis',
  },
];

function PrincipalShortcut({
  shortcut,
  onPress,
}: {
  shortcut: { label: string; icon: keyof typeof Ionicons.glyphMap; feature: string };
  onPress: () => void;
}) {
  const { allowed } = useFeature(shortcut.feature);

  return (
    <TouchableOpacity
      style={[styles.shortcut, !allowed && styles.shortcutLocked]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.shortcutIcon}>
        <Ionicons name={shortcut.icon} size={20} color={Colors.primary} />
        {!allowed && (
          <View style={styles.shortcutLock}>
            <Ionicons name="lock-closed" size={10} color={Colors.inkMuted} />
          </View>
        )}
      </View>
      <Text style={styles.shortcutLabel}>{shortcut.label}</Text>
    </TouchableOpacity>
  );
}

export const PrincipalHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session, refreshProfile } = useAuth();
  const tenantId = useTenantId();
  const user = session?.user;
  const { name: schoolName, logoUrl: schoolLogoUrl } = useCurrentSchoolBranding();

  const { data: overview, isLoading, refetch } = usePrincipalOverview();
  const { data: approvals = [], refetch: refetchApprovals } = useApprovals();
  const { data: announcements = [] } = useAnnouncements();
  const schoolClosed = useSchoolClosedToday(announcements);
  const { data: appNotifications = [] } = useAppNotifications();
  const unreadCount = appNotifications.filter((n) => n.unread).length;

  useFocusEffect(
    useCallback(() => {
      void refetch();
      void refetchApprovals();
      void refreshProfile();
      if (tenantId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.mySchools(tenantId) });
      }
    }, [refetch, refetchApprovals, refreshProfile, tenantId])
  );

  const pending = approvals.filter((a) => a.status === 'pending');

  const openApprovalsTab = () => {
    navigation.getParent()?.navigate('Approvals');
  };
  const staffRoster = overview?.staff ?? [];
  const staffTotal = overview?.kpis.staffTotal ?? staffRoster.length;
  const notCheckedIn = staffRoster.filter((s) => !s.checkedIn);
  const checkedIn = staffRoster.filter((s) => s.checkedIn);

  const studentsPct = overview?.kpis.studentsPresentPct ?? 0;
  const staffPresent = overview?.kpis.staffPresent ?? checkedIn.length;
  const staffPct = staffTotal ? Math.round((staffPresent / staffTotal) * 100) : 0;
  const studentsLabel = isLoading ? '—' : `${studentsPct}%`;
  const staffInLabel = isLoading ? '—' : `${staffPresent}/${staffTotal}`;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <HomeSchoolHeader
            logoUrl={schoolLogoUrl}
            schoolName={schoolName}
            greetingLine="Welcome,"
            nameLine={(user?.name ?? 'Principal').split(' ')[0]}
            rightSlot={
              <View style={styles.headerActions}>
                <NotificationBell
                  unreadCount={unreadCount}
                  onDark
                  onPress={() => navigation.navigate('AnnouncementsScreen')}
                />
                <MoreFeaturesAvatar
                  size={42}
                  onDark
                  onPress={() => navigateToMoreScreen(navigation, true)}
                />
              </View>
            }
          />
        </Animated.View>

        {schoolClosed && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SchoolClosedBanner title={schoolClosed.title} description={schoolClosed.description} />
          </Animated.View>
        )}

        {/* Attendance chart */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Card style={styles.attCard}>
            <Text style={styles.attTitle}>{"Today's Attendance"}</Text>
            <View style={styles.attDonuts}>
              <View style={styles.attItem}>
                <Donut
                  percentage={studentsPct}
                  size={96}
                  strokeWidth={10}
                  color={Colors.primary}
                  backgroundColor={Colors.primarySoft2}
                />
                <Text style={styles.attLabel}>Students</Text>
              </View>
              <View style={styles.attItem}>
                <Donut
                  percentage={staffPct}
                  size={96}
                  strokeWidth={10}
                  color={Colors.present}
                  backgroundColor={Colors.presentSoft}
                />
                <Text style={styles.attLabel}>Teachers</Text>
                <Text style={styles.attSub}>
                  {staffPresent}/{staffTotal} in
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* KPIs */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.kpiRow}>
          <Kpi label="Students" value={studentsLabel} />
          <Kpi label="Staff in" value={staffInLabel} />
          <Kpi
            label="Pending"
            value={isLoading ? '—' : `${overview?.kpis.pendingApprovals ?? pending.length}`}
          />
        </Animated.View>

        {/* Approvals preview */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.section}>
          <SectionHeader title="Approvals" actionLabel="View All" onAction={openApprovalsTab} />
          {pending.slice(0, 3).map((a) => (
            <TouchableOpacity key={a.id} style={styles.previewRow} onPress={openApprovalsTab}>
              <Avatar initials={a.requesterInitials} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{a.title}</Text>
                <Text style={styles.previewMeta}>{a.requesterName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Staff checked in */}
        <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.section}>
          <SectionHeader title="Staff checked in" />
          {isLoading ? (
            <Text style={styles.previewMeta}>Loading…</Text>
          ) : staffTotal === 0 ? (
            <Text style={styles.previewMeta}>No staff on roster for this school.</Text>
          ) : checkedIn.length === 0 ? (
            <Text style={styles.previewMeta}>No staff check-ins yet today.</Text>
          ) : (
            checkedIn.slice(0, 5).map((s) => {
              const status = staffCheckInStatus(s);
              return (
                <View key={s.teacherId} style={styles.previewRow}>
                  <Avatar initials={s.initials} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewTitle}>{s.name}</Text>
                    <Text style={styles.previewMeta}>
                      {staffDisplayLabel(s)} · {status.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={status.flagged ? 'warning-outline' : 'checkmark-circle'}
                    size={16}
                    color={status.flagged ? Colors.late : Colors.present}
                  />
                </View>
              );
            })
          )}
        </Animated.View>

        {/* Staff not checked in */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <SectionHeader title="Not checked in" />
          {isLoading ? (
            <Text style={styles.previewMeta}>Loading…</Text>
          ) : staffTotal === 0 ? (
            <Text style={styles.previewMeta}>No staff on roster for this school.</Text>
          ) : notCheckedIn.length === 0 ? (
            <Text style={styles.previewMeta}>Everyone is in.</Text>
          ) : (
            notCheckedIn.map((s) => (
              <View key={s.teacherId} style={styles.previewRow}>
                <Avatar initials={s.initials} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{s.name}</Text>
                  <Text style={styles.previewMeta}>{staffDisplayLabel(s)}</Text>
                </View>
                <Ionicons name="ellipse" size={10} color={Colors.absent} />
              </View>
            ))
          )}
        </Animated.View>

        {/* Quick shortcuts */}
        <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.shortcutRow}>
          {SHORTCUTS.map((s) => (
            <PrincipalShortcut
              key={s.key}
              shortcut={s}
              onPress={() => navigation.navigate(s.key)}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const Kpi: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.kpi}>
    <Text style={styles.kpiValue}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attCard: { padding: 16, marginBottom: 16, gap: 16 },
  attTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  attDonuts: { flexDirection: 'row', justifyContent: 'space-around' },
  attItem: { alignItems: 'center', gap: 8 },
  attLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  attSub: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: -4 },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  kpi: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.card,
  },
  kpiValue: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.primary },
  kpiLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted, marginTop: 4 },
  section: { marginTop: 20 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
  },
  previewTitle: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  previewMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  shortcutRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  shortcut: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    ...Shadows.card,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLocked: { opacity: 0.72 },
  shortcutLock: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    padding: 2,
  },
  shortcutLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.ink },
});
