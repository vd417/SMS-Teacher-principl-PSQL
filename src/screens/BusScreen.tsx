import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card, Avatar, Toast } from '../components';
import { BusMap } from './bus/BusMap';
import {
  useAssignedBus,
  useBusPosition,
  useBusRoster,
  useSaveBoarding,
} from '@/features/bus/hooks';
import type { BoardingRecord, BoardingStatus } from '@/data/domain';

const NEXT: Record<BoardingStatus, BoardingStatus> = {
  pending: 'boarded',
  boarded: 'absent',
  absent: 'pending',
};
const STATUS_COLOR: Record<BoardingStatus, string> = {
  pending: Colors.inkMuted,
  boarded: Colors.present,
  absent: Colors.absent,
};
const STATUS_ICON: Record<BoardingStatus, string> = {
  pending: 'ellipse-outline',
  boarded: 'checkmark-circle',
  absent: 'close-circle',
};

export const BusScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: bus } = useAssignedBus();
  const busId = bus?.id ?? '';
  const { data: position } = useBusPosition(busId);
  const { data: roster } = useBusRoster(busId);
  const save = useSaveBoarding(busId);

  const [draft, setDraft] = useState<BoardingRecord[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (roster) setDraft(roster);
  }, [roster]);

  const cycle = (studentId: string) =>
    setDraft((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: NEXT[r.status] } : r))
    );

  const boardedCount = draft.filter((r) => r.status === 'boarded').length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Bus Duty" showBack />
      </Animated.View>

      {bus && (
        <>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Card style={styles.busCard}>
              <View style={styles.busHeader}>
                <View style={styles.busIcon}>
                  <Ionicons name="bus" size={22} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.busNumber}>
                    {bus.number} · {bus.routeName}
                  </Text>
                  <TouchableOpacity
                    style={styles.driverRow}
                    onPress={() => Linking.openURL(`tel:${bus.driverPhone}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.busDriver}>Driver: {bus.driver}</Text>
                    <Ionicons name="call-outline" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statusRow}>
                <Ionicons name="navigate" size={14} color={Colors.primary} />
                <Text style={styles.statusText}>
                  {position
                    ? `En route to ${position.nextStopName} · ~${position.etaMinutes} min`
                    : 'Locating bus…'}
                </Text>
              </View>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.mapWrap}>
            <BusMap bus={bus} position={position} />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.rosterSection}>
            <View style={styles.rosterHeader}>
              <Text style={styles.sectionTitle}>Boarding</Text>
              <View style={styles.summaryPill}>
                <Text style={styles.summaryText}>
                  {boardedCount} / {draft.length} boarded
                </Text>
              </View>
            </View>
            <Card padding={0}>
              {draft.map((r, i) => (
                <TouchableOpacity
                  key={r.studentId}
                  style={[styles.row, i < draft.length - 1 && styles.rowBorder]}
                  onPress={() => cycle(r.studentId)}
                  activeOpacity={0.7}
                >
                  <Avatar initials={r.initials} size={36} />
                  <Text style={styles.rowName}>{r.studentName}</Text>
                  <Ionicons
                    name={STATUS_ICON[r.status] as never}
                    size={22}
                    color={STATUS_COLOR[r.status]}
                  />
                </TouchableOpacity>
              ))}
            </Card>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => save.mutate(draft, { onSuccess: () => setToastVisible(true) })}
              disabled={save.isPending}
              activeOpacity={0.85}
            >
              <Text style={styles.saveLabel}>{save.isPending ? 'Saving…' : 'Save Boarding'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </>
      )}
      <Toast
        visible={toastVisible}
        message="Boarding saved"
        type="success"
        onHide={() => setToastVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20 },
  busCard: { marginTop: 8 },
  busHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  busIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busNumber: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  busDriver: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  statusText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.primary },
  mapWrap: { marginTop: 16 },
  rosterSection: { marginTop: 24 },
  rosterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  summaryPill: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  summaryText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.ruleSoft },
  rowName: { flex: 1, fontFamily: FontFamily.medium, fontSize: 15, color: Colors.ink },
  saveBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveLabel: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.white },
});
