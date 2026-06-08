import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar, Card, SectionHeader, PunchButton } from '../../components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMyAttendanceToday, usePunch } from '@/features/teacherAttendance/hooks';
import { usePrincipalOverview } from '@/features/principal/hooks';
import { useApprovals } from '@/features/approvals/hooks';
import { isAppError } from '@/lib/errors';

const SHORTCUTS = [
  { key: 'AnnouncementsScreen', label: 'Broadcast', icon: 'megaphone-outline' as const },
  { key: 'BusScreen', label: 'Live Bus', icon: 'bus-outline' as const },
  { key: 'TeacherDirectoryScreen', label: 'Teachers', icon: 'people-outline' as const },
];

export const PrincipalHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const user = session?.user;

  const { data: overview } = usePrincipalOverview();
  const { data: approvals = [] } = useApprovals();
  const { data: myToday, isLoading: myTodayLoading } = useMyAttendanceToday();
  const punch = usePunch();
  const [msg, setMsg] = useState<string | null>(null);

  const canCheckIn = !myTodayLoading && !myToday?.checkIn;
  const pending = approvals.filter((a) => a.status === 'pending');
  const notCheckedIn = (overview?.staff ?? []).filter((s) => !s.checkedIn);

  const handleCheckIn = () => {
    punch.mutate('in', {
      onSuccess: (day) => {
        const ev = day.checkIn;
        setMsg(ev?.verified ? 'Checked in ✓' : 'Checked in — flagged');
      },
      onError: (e) => setMsg(isAppError(e) ? e.message : 'Could not check in.'),
    });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Welcome,</Text>
            <Text style={styles.name}>{(user?.name ?? 'Principal').split(' ')[0]} 👋</Text>
            <Text style={styles.sub}>{user?.title ?? 'Principal'}</Text>
          </View>
          <Avatar initials={user?.initials ?? '?'} size={50} />
        </Animated.View>

        {/* Check-in */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <Card style={styles.checkCard}>
            <View style={styles.rowCenter}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.checkTitle}>My Attendance</Text>
            </View>
            {canCheckIn ? (
              <PunchButton
                label="Check In"
                icon="enter-outline"
                onPress={handleCheckIn}
                loading={punch.isPending}
              />
            ) : (
              <View style={styles.rowCenter}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.present} />
                <Text style={styles.checkedText}>{msg ?? 'Checked in'}</Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* KPIs */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.kpiRow}>
          <Kpi label="Students" value={`${overview?.kpis.studentsPresentPct ?? '—'}%`} />
          <Kpi
            label="Staff in"
            value={overview ? `${overview.kpis.staffPresent}/${overview.kpis.staffTotal}` : '—'}
          />
          <Kpi label="Pending" value={`${overview?.kpis.pendingApprovals ?? pending.length}`} />
        </Animated.View>

        {/* Approvals preview */}
        <Animated.View entering={FadeInDown.delay(240).springify()} style={styles.section}>
          <SectionHeader
            title="Approvals"
            actionLabel="View All"
            onAction={() => navigation.navigate('Approvals')}
          />
          {pending.slice(0, 3).map((a) => (
            <TouchableOpacity
              key={a.id}
              style={styles.previewRow}
              onPress={() => navigation.navigate('Approvals')}
            >
              <Avatar initials={a.requesterInitials} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewTitle}>{a.title}</Text>
                <Text style={styles.previewMeta}>{a.requesterName}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Staff not checked in */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <SectionHeader title="Not checked in" />
          {notCheckedIn.length === 0 ? (
            <Text style={styles.previewMeta}>Everyone is in.</Text>
          ) : (
            notCheckedIn.map((s) => (
              <View key={s.teacherId} style={styles.previewRow}>
                <Avatar initials={s.initials} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle}>{s.name}</Text>
                  <Text style={styles.previewMeta}>{s.subject}</Text>
                </View>
                <Ionicons name="ellipse" size={10} color={Colors.absent} />
              </View>
            ))
          )}
        </Animated.View>

        {/* Quick shortcuts */}
        <Animated.View entering={FadeInDown.delay(360).springify()} style={styles.shortcutRow}>
          {SHORTCUTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={styles.shortcut}
              onPress={() => navigation.navigate(s.key)}
            >
              <View style={styles.shortcutIcon}>
                <Ionicons name={s.icon} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.shortcutLabel}>{s.label}</Text>
            </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  greeting: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  name: { fontFamily: FontFamily.extraBold, fontSize: 24, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted, marginTop: 2 },
  checkCard: { padding: 16, marginBottom: 16, gap: 12 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  checkedText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.ink3 },
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
  shortcutLabel: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.ink },
});
