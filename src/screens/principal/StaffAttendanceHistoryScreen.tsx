import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { ScreenHeader } from '../../components';
import { formatLongDate, formatTimeOfDay } from '@/lib/date';
import { useStaffAttendanceHistory } from '@/features/principal/hooks';
import type { CheckEvent, TeacherAttendanceDay } from '@/data/domain';
import type { PrincipalHomeStackParamList } from '../../navigation/types';

type Route = RouteProp<PrincipalHomeStackParamList, 'StaffAttendanceHistoryScreen'>;

const timeOf = (e?: CheckEvent) => formatTimeOfDay(e?.at);

const dayFlagged = (d: TeacherAttendanceDay) =>
  d.checkIn?.verified === false || d.checkOut?.verified === false;

export const StaffAttendanceHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { params } = useRoute<Route>();
  const { data: history = [], isLoading, isError } = useStaffAttendanceHistory(params.personId);

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader title={params.name} subtitle="Check-in / check-out history" showBack />
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : isError ? (
          <Text style={styles.emptyText}>Could not load attendance history.</Text>
        ) : history.length === 0 ? (
          <Text style={styles.emptyText}>No attendance history yet.</Text>
        ) : (
          history.map((d, i) => (
            <Animated.View
              key={d.date}
              entering={FadeInDown.delay(100 + i * 30).springify()}
              style={styles.historyRow}
            >
              <Text style={styles.historyDate}>{formatLongDate(d.date)}</Text>
              <Text style={styles.historyTimes}>
                {timeOf(d.checkIn)} – {timeOf(d.checkOut)}
              </Text>
              {dayFlagged(d) && <Ionicons name="warning-outline" size={14} color={Colors.absent} />}
            </Animated.View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 10 },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    marginTop: 24,
  },
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
