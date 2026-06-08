import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { useTimetable } from '@/features/timetable/hooks';
import type { WeekDay } from '@/data/domain';

const DAYS: WeekDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const SchoolTimetableScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: slots = [], isLoading } = useTimetable();
  const [day, setDay] = useState<WeekDay>('Mon');

  const daySlots = slots.filter((s) => s.day === day).sort((a, b) => a.period - b.period);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Timetable</Text>
        <Text style={styles.sub}>School master schedule</Text>

        {/* Day selector */}
        <View style={styles.dayRow}>
          {DAYS.map((d) => {
            const active = d === day;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, active && styles.dayChipActive]}
                onPress={() => setDay(d)}
                activeOpacity={0.85}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : daySlots.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-clear-outline" size={44} color={Colors.inkMuted} />
            <Text style={styles.emptyText}>No periods scheduled</Text>
          </View>
        ) : (
          daySlots.map((s, i) => (
            <Animated.View
              key={s.id}
              entering={FadeInDown.delay(40 * i).springify()}
              style={styles.slotRow}
            >
              <View style={styles.periodBadge}>
                <Text style={styles.periodNum}>P{s.period}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.slotSubject}>{s.subject}</Text>
                <Text style={styles.slotMeta}>
                  {s.className} · {s.room}
                </Text>
              </View>
              <Text style={styles.slotTime}>
                {s.startTime}–{s.endTime}
              </Text>
            </Animated.View>
          ))
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
  dayRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dayChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.white,
    alignItems: 'center',
    ...Shadows.card,
  },
  dayChipActive: { backgroundColor: Colors.primary },
  dayChipText: { fontFamily: FontFamily.bold, fontSize: 13, color: Colors.inkMuted },
  dayChipTextActive: { color: Colors.white },
  empty: { alignItems: 'center', marginTop: 50, gap: 10 },
  emptyText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.inkMuted },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  periodBadge: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodNum: { fontFamily: FontFamily.extraBold, fontSize: 14, color: Colors.primary },
  slotSubject: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  slotMeta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted, marginTop: 2 },
  slotTime: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.inkMuted },
});
