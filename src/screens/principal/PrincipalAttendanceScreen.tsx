import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar } from '../../components';
import { usePrincipalAttendance } from '@/features/principal/hooks';

export const PrincipalAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data, isLoading } = usePrincipalAttendance();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Attendance</Text>
        <Text style={styles.sub}>{data?.date ?? 'Today'}</Text>

        {isLoading || !data ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* School total */}
            <Animated.View entering={FadeInDown.springify()} style={styles.totalCard}>
              <View>
                <Text style={styles.totalPct}>{data.overallPct}%</Text>
                <Text style={styles.totalLabel}>School present today</Text>
              </View>
              <View style={styles.totalRight}>
                <Text style={styles.totalCount}>
                  {data.presentTotal}/{data.studentTotal}
                </Text>
                <Text style={styles.totalLabel}>students</Text>
              </View>
            </Animated.View>

            {/* Students by class */}
            <Text style={styles.section}>Students by class</Text>
            {data.classes.map((c, i) => (
              <Animated.View
                key={c.classId}
                entering={FadeInDown.delay(40 * i).springify()}
                style={styles.classRow}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.className}>{c.className}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${c.pct}%` }]} />
                  </View>
                </View>
                <Text style={styles.classMeta}>
                  {c.present}/{c.total}
                </Text>
                <Text style={styles.classPct}>{c.pct}%</Text>
              </Animated.View>
            ))}

            {/* Staff */}
            <Text style={styles.section}>Staff</Text>
            {data.staff.map((s, i) => (
              <Animated.View
                key={s.teacherId}
                entering={FadeInDown.delay(40 * i).springify()}
                style={styles.staffRow}
              >
                <Avatar initials={s.initials} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.staffName}>{s.name}</Text>
                  <Text style={styles.staffMeta}>{s.subject}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: s.checkedIn ? Colors.primarySoft : Colors.paper2 },
                  ]}
                >
                  <Ionicons
                    name={s.checkedIn ? 'checkmark-circle' : 'ellipse-outline'}
                    size={13}
                    color={s.checkedIn ? Colors.present : Colors.inkMuted}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: s.checkedIn ? Colors.present : Colors.inkMuted },
                    ]}
                  >
                    {s.checkedIn ? 'In' : 'Out'}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  h1: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 16 },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 20,
    marginBottom: 8,
    ...Shadows.card,
  },
  totalPct: { fontFamily: FontFamily.extraBold, fontSize: 34, color: Colors.primary },
  totalCount: { fontFamily: FontFamily.bold, fontSize: 20, color: Colors.ink },
  totalRight: { alignItems: 'flex-end' },
  totalLabel: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  section: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.ink,
    marginTop: 22,
    marginBottom: 10,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  className: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink, marginBottom: 8 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.paper2, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  classMeta: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted },
  classPct: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.primary,
    width: 42,
    textAlign: 'right',
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  staffName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  staffMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  statusText: { fontFamily: FontFamily.bold, fontSize: 12 },
});
