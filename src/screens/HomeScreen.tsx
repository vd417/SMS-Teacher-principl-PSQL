import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Card, Donut, SectionHeader, Toast } from '../components';
import { useAuth } from '@/features/auth/AuthProvider';
import { useClasses } from '@/features/classes/hooks';
import { useDashboardStats } from '@/features/dashboard/hooks';
import { useAnnouncements } from '@/features/announcements/hooks';
import { useMyAttendanceToday, usePunch } from '@/features/teacherAttendance/hooks';
import { isAppError } from '@/lib/errors';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import type { HomeStackParamList } from '../navigation/types';

type HomeNav = NativeStackNavigationProp<HomeStackParamList>;
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

const QUICK_ACTIONS = [
  {
    icon: 'people',
    label: 'Attendance',
    screen: 'AttendancePickClass',
    color: Colors.present,
    soft: Colors.presentSoft,
  },
  {
    icon: 'ribbon',
    label: 'Marks',
    screen: 'GradesScreen',
    color: Colors.blue,
    soft: Colors.blueSoft,
  },
  {
    icon: 'document-text',
    label: 'Tests',
    screen: 'ExamsScreen',
    color: Colors.coral,
    soft: Colors.coralSoft,
  },
  {
    icon: 'book',
    label: 'Homework',
    screen: 'AssignmentsScreen',
    color: Colors.late,
    soft: Colors.lateSoft,
  },
] as const;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNav>();
  const insets = useSafeAreaInsets();
  const [_search, setSearch] = useState('');

  const { session } = useAuth();
  const user = session?.user;
  const tenantName = session?.tenant.name ?? 'School';

  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: announcements = [] } = useAnnouncements();

  const { data: myToday, isLoading: myTodayLoading } = useMyAttendanceToday();
  const punch = usePunch();
  const [punchToast, setPunchToast] = useState<{
    msg: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const canCheckIn = !myTodayLoading && !myToday?.checkIn;
  const canCheckOut = !myTodayLoading && !!myToday?.checkIn && !myToday?.checkOut;
  const myLatestPunch = myToday?.checkOut ?? myToday?.checkIn;

  const handlePunch = (kind: 'in' | 'out') => {
    punch.mutate(kind, {
      onSuccess: (day) => {
        const ev = kind === 'in' ? day.checkIn : day.checkOut;
        const meters = ev ? Math.round(ev.distanceMeters) : 0;
        setPunchToast({
          msg: ev?.verified
            ? `Checked ${kind} — ${meters} m from school ✓`
            : `Checked ${kind} — ${meters} m away, flagged`,
          type: ev?.verified ? 'success' : 'warning',
        });
      },
      onError: (e) =>
        setPunchToast({
          msg: isAppError(e) ? e.message : 'Could not record punch. Try again.',
          type: 'error',
        }),
    });
  };

  const upcomingExam = 'Mid-Term Math · May 10';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.teacherName}>{(user?.name ?? 'Teacher').split(' ')[0]} 👋</Text>
            <Text style={styles.subtitle}>{tenantName}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('MoreScreen' as never)}>
            <Avatar initials={user?.initials ?? '?'} size={50} />
          </TouchableOpacity>
        </Animated.View>

        {/* Upcoming Banner */}
        <Animated.View entering={FadeInDown.delay(120).springify()}>
          <TouchableOpacity style={styles.banner} activeOpacity={0.85}>
            <View style={styles.bannerDot} />
            <Ionicons name="alarm" size={15} color={Colors.primary} />
            <Text style={styles.bannerText}>Next exam: {upcomingExam}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.primaryBright} />
          </TouchableOpacity>
        </Animated.View>

        {/* My Check-In / Check-Out */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Card style={styles.myAttCard}>
            <View style={styles.myAttHeader}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.myAttTitle}>My Attendance</Text>
              {myToday?.checkIn && (
                <Text style={styles.myAttStatus}>
                  {myToday.checkOut ? 'Checked out' : 'Checked in'}
                </Text>
              )}
            </View>
            {myLatestPunch && (
              <View style={styles.myAttHint}>
                <Ionicons
                  name={myLatestPunch.verified ? 'location' : 'warning'}
                  size={12}
                  color={myLatestPunch.verified ? Colors.inkMuted : Colors.late}
                />
                <Text style={styles.myAttHintText}>
                  {Math.round(myLatestPunch.distanceMeters)} m from school
                  {myLatestPunch.verified ? '' : ' · unverified'}
                </Text>
              </View>
            )}
            <View style={styles.myAttActions}>
              <TouchableOpacity
                style={[
                  styles.myAttBtn,
                  (!canCheckIn || punch.isPending) && styles.myAttBtnDisabled,
                ]}
                disabled={!canCheckIn || punch.isPending}
                onPress={() => handlePunch('in')}
                activeOpacity={0.85}
              >
                {punch.isPending && punch.variables === 'in' ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.myAttBtnText}>Check In</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.myAttBtn,
                  (!canCheckOut || punch.isPending) && styles.myAttBtnDisabled,
                ]}
                disabled={!canCheckOut || punch.isPending}
                onPress={() => handlePunch('out')}
                activeOpacity={0.85}
              >
                {punch.isPending && punch.variables === 'out' ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.myAttBtnText}>Check Out</Text>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        </Animated.View>

        {/* Attendance Card */}
        <Animated.View entering={FadeInDown.delay(180).springify()}>
          <Card style={styles.attendanceCard}>
            <View style={styles.attendanceTop}>
              <View>
                <Text style={styles.attendanceTitle}>{"Today's Attendance"}</Text>
                <Text style={styles.attendanceDate}>Monday, 27 Apr 2026</Text>
              </View>
              {statsLoading ? (
                <Skeleton height={80} width={80} radius={40} />
              ) : (
                <Donut
                  percentage={stats?.attendanceToday ?? 94}
                  size={80}
                  strokeWidth={8}
                  color={Colors.primary}
                  backgroundColor={Colors.primarySoft2}
                />
              )}
            </View>
            <View style={styles.attStats}>
              {[
                { label: 'Present', value: '28', color: Colors.present, soft: Colors.presentSoft },
                { label: 'Absent', value: '2', color: Colors.absent, soft: Colors.absentSoft },
                { label: 'Late', value: '1', color: Colors.late, soft: Colors.lateSoft },
                { label: 'Leave', value: '1', color: Colors.leave, soft: Colors.leaveSoft },
              ].map((s) => (
                <View key={s.label} style={[styles.statPill, { backgroundColor: s.soft }]}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLbl, { color: s.color }]}>{s.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity
              style={styles.markAttBtn}
              onPress={() => navigation.navigate('AttendancePickClass')}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.markAttText}>Mark Attendance</Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>

        {/* My Classes */}
        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
          <SectionHeader
            title="My Classes"
            actionLabel="View All"
            onAction={() => navigation.navigate('ClassesScreen' as never)}
          />
          {classesLoading ? (
            <View style={styles.classGrid}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={120} width={CARD_WIDTH} radius={16} />
              ))}
            </View>
          ) : (
            <View style={styles.classGrid}>
              {classes.map((cls, i) => {
                const cs = deriveColorSet(cls.id);
                return (
                  <Animated.View
                    key={cls.id}
                    entering={FadeInRight.delay(280 + i * 60).springify()}
                    style={[styles.classCard, { backgroundColor: cs.color, width: CARD_WIDTH }]}
                  >
                    <TouchableOpacity
                      onPress={() => navigation.navigate('ClassesScreen' as never)}
                      style={styles.classCardInner}
                      activeOpacity={0.85}
                    >
                      <View
                        style={[styles.classIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                      >
                        <Ionicons name="school-outline" size={20} color={Colors.white} />
                      </View>
                      <Text style={styles.classCardName}>
                        {cls.name}-{cls.section}
                      </Text>
                      <Text style={styles.classCardSubject}>{cls.subject}</Text>
                      <View style={styles.classCardFooter}>
                        <View style={styles.classCardBadge}>
                          <Ionicons name="people" size={11} color={cs.color} />
                          <Text style={[styles.classCardBadgeText, { color: cs.color }]}>
                            {cls.studentCount}
                          </Text>
                        </View>
                        <Text style={styles.classCardRoom}>{cls.room.replace('Room ', 'R-')}</Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(380).springify()} style={styles.section}>
          <SectionHeader title="Quick Actions" />
          <View style={styles.qaGrid}>
            {QUICK_ACTIONS.map((qa) => (
              <TouchableOpacity
                key={qa.label}
                style={[styles.qaCard, { backgroundColor: qa.soft }]}
                onPress={() => navigation.navigate(qa.screen as never)}
                activeOpacity={0.8}
              >
                <View style={[styles.qaIconWrap, { backgroundColor: qa.color }]}>
                  <Ionicons name={qa.icon} size={20} color={Colors.white} />
                </View>
                <Text style={[styles.qaLabel, { color: qa.color }]}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Announcements */}
        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.section}>
          <SectionHeader
            title="Announcements"
            actionLabel="All"
            onAction={() => navigation.navigate('AnnouncementsScreen')}
          />
          {announcements.slice(0, 3).map((ann) => (
            <TouchableOpacity
              key={ann.id}
              style={styles.annItem}
              onPress={() => navigation.navigate('AnnouncementsScreen')}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.annDot,
                  {
                    backgroundColor:
                      ann.type === 'urgent'
                        ? Colors.absent
                        : ann.type === 'warning'
                          ? Colors.late
                          : ann.type === 'event'
                            ? Colors.blue
                            : Colors.present,
                  },
                ]}
              />
              <View style={styles.annContent}>
                <Text style={styles.annTitle} numberOfLines={1}>
                  {ann.pinned ? '📌 ' : ''}
                  {ann.title}
                </Text>
                <Text style={styles.annFrom}>
                  {ann.from} · {ann.date}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Stats Row */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.section}>
          <SectionHeader title="Overview" />
          {statsLoading ? (
            <View style={styles.statsRow}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} height={80} width={(width - 48 - 30) / 4} radius={12} />
              ))}
            </View>
          ) : (
            <View style={styles.statsRow}>
              {[
                {
                  label: 'Students',
                  value: String(stats?.totalStudents ?? 0),
                  icon: 'people-outline',
                },
                {
                  label: 'Classes',
                  value: String(stats?.totalClasses ?? 0),
                  icon: 'school-outline',
                },
                {
                  label: 'Upcoming Exams',
                  value: String(stats?.upcomingExams ?? 0),
                  icon: 'document-text-outline',
                },
                {
                  label: 'Active Tasks',
                  value: String(stats?.pendingAssignments ?? 0),
                  icon: 'clipboard-outline',
                },
              ].map((s) => (
                <Card key={s.label} style={styles.statCard} padding={12}>
                  <Ionicons name={s.icon as never} size={20} color={Colors.primary} />
                  <Text style={styles.statCardVal}>{s.value}</Text>
                  <Text style={styles.statCardLbl}>{s.label}</Text>
                </Card>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Toast
        visible={!!punchToast}
        message={punchToast?.msg ?? ''}
        type={punchToast?.type ?? 'success'}
        onHide={() => setPunchToast(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {},
  greeting: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
  },
  teacherName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
    color: Colors.ink,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 20,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  bannerText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
  },
  attendanceCard: {
    marginBottom: 24,
  },
  attendanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.ink,
  },
  attendanceDate: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 3,
  },
  attStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  statPill: {
    flex: 1,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statVal: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
  },
  statLbl: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
  markAttBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  markAttText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  classGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  classCard: {
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.card,
  },
  classCardInner: {
    padding: 16,
  },
  classIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  classCardName: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.white,
  },
  classCardSubject: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    marginBottom: 12,
  },
  classCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  classCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  classCardBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
  classCardRoom: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  qaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  qaCard: {
    flex: 1,
    borderRadius: Radii.lg,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    ...Shadows.card,
  },
  qaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    textAlign: 'center',
  },
  annItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  annDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  annContent: {
    flex: 1,
  },
  annTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.ink,
  },
  annFrom: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statCardVal: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.primary,
  },
  statCardLbl: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.inkMuted,
    textAlign: 'center',
  },
  myAttCard: { marginTop: 12, padding: 16 },
  myAttHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  myAttTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink, flex: 1 },
  myAttStatus: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.present },
  myAttHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  myAttHintText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted },
  myAttActions: { flexDirection: 'row', gap: 12 },
  myAttBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  myAttBtnDisabled: { backgroundColor: Colors.primarySoft2 },
  myAttBtnText: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white },
});
