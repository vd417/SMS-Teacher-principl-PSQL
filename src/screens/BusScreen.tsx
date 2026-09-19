import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card, Avatar, Toast, TierGate } from '../components';
import { BusMap } from './bus/BusMap';
import { FleetMap } from '@/components/transport/FleetMap';
import {
  useAssignedBus,
  useBusPosition,
  useBusRoster,
  useMyRouteBuses,
  useSaveBoarding,
} from '@/features/bus/hooks';
import { useTransportFleetPush } from '@/features/transport/hooks';
import { useRouteGeometry } from '@/features/transport/useRouteGeometry';
import { isAppError } from '@/lib/errors';
import type { BoardingRecord, BoardingStatus, MyRouteBus } from '@/data/domain';

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
  const { data: bus, isLoading, isError } = useAssignedBus();
  const busId = bus?.id ?? '';
  const { data: position } = useBusPosition(busId);
  const { data: ownBusRouteGeometry } = useRouteGeometry(busId || null);
  const { data: roster } = useBusRoster(busId);
  const save = useSaveBoarding(busId);
  const { data: myRoutes = [] } = useMyRouteBuses();
  const readOnlyBuses = myRoutes.filter((b) => !b.isDutyTeacher);
  useTransportFleetPush([...(busId ? [busId] : []), ...readOnlyBuses.map((b) => b.busId)]);
  // The read-only "other routes" FleetMap has no built-in selection, so add a minimal local
  // selection here purely to give road-geometry lookup a bus to key off. MyRouteBus also has no
  // separate routeId field (one bus == one route in this app's domain model), so the bus's own
  // id is passed as the route identifier, same convention as PrincipalTransportScreen.
  const [selectedReadOnlyBusId, setSelectedReadOnlyBusId] = useState<string | null>(null);
  const { data: selectedReadOnlyRouteGeometry } = useRouteGeometry(selectedReadOnlyBusId);

  const [draft, setDraft] = useState<BoardingRecord[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  useEffect(() => {
    if (roster) setDraft(roster);
  }, [roster]);

  const cycle = (studentId: string) =>
    setDraft((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, status: NEXT[r.status] } : r))
    );

  const boardedCount = draft.filter((r) => r.status === 'boarded').length;

  const readOnlyRoutesSection =
    readOnlyBuses.length > 0 ? (
      <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.routesSection}>
        <Text style={styles.sectionTitle}>Your other routes</Text>
        <Text style={styles.routesHint}>
          Read-only — you&apos;re not the duty teacher on these buses.
        </Text>
        <TierGate feature="transport.gps" title="Live map locked" minHeight={140}>
          <FleetMap
            buses={readOnlyBuses.map((b) => ({
              busId: b.busId,
              busNo: b.busNo,
              status: 'on_route',
              lat: b.lat,
              lng: b.lng,
            }))}
            selectedBusId={selectedReadOnlyBusId}
            onSelectBus={(id) => setSelectedReadOnlyBusId((prev) => (prev === id ? null : id))}
            routeGeometry={selectedReadOnlyRouteGeometry}
          />
        </TierGate>
        <View style={styles.routesList}>
          {readOnlyBuses.map((b) => (
            <RouteRow key={b.busId} bus={b} />
          ))}
        </View>
      </Animated.View>
    ) : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Bus Duty" showBack />
      </Animated.View>

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : isError || !bus ? (
        <>
          <View style={styles.emptyWrap}>
            <Ionicons name="bus-outline" size={48} color={Colors.inkSoft} />
            <Text style={styles.emptyTitle}>No bus duty assigned</Text>
            <Text style={styles.emptyText}>
              Ask your principal to assign you on the Live Bus fleet screen. Once assigned, you can
              mark student boarding here.
            </Text>
          </View>
          {readOnlyRoutesSection}
        </>
      ) : (
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
              <TierGate
                feature="transport.gps"
                title="Live GPS tracking locked"
                blurb="Real-time bus location is part of the Platinum plan. Contact your school admin to upgrade."
                minHeight={140}
              >
                <View style={styles.statusRow}>
                  <Ionicons name="navigate" size={14} color={Colors.primary} />
                  <Text style={styles.statusText}>
                    {position
                      ? `En route to ${position.nextStopName} · ~${position.etaMinutes} min`
                      : 'Locating bus…'}
                  </Text>
                </View>
              </TierGate>
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.mapWrap}>
            <TierGate feature="transport.gps" title="Live map locked" minHeight={180}>
              <BusMap bus={bus} position={position} routeGeometry={ownBusRouteGeometry} />
            </TierGate>
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
              {draft.length === 0 ? (
                <View style={styles.emptyRoster}>
                  <Text style={styles.emptyRosterText}>
                    No students assigned to this bus yet. Boarding saves once the driver starts a
                    live trip.
                  </Text>
                </View>
              ) : (
                draft.map((r, i) => (
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
                ))
              )}
            </Card>

            <TouchableOpacity
              style={[styles.saveBtn, draft.length === 0 && styles.saveBtnDisabled]}
              onPress={() =>
                save.mutate(draft, {
                  onSuccess: () => setToastVisible(true),
                  onError: (e) =>
                    setErrorToast(
                      isAppError(e) && e.code === 'no_active_trip'
                        ? 'No live trip for this bus yet. Ask admin to start the route.'
                        : isAppError(e)
                          ? e.message
                          : 'Could not save boarding. Try again.'
                    ),
                })
              }
              disabled={save.isPending || draft.length === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.saveLabel}>{save.isPending ? 'Saving…' : 'Save Boarding'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {readOnlyRoutesSection}
        </>
      )}
      <Toast
        visible={toastVisible}
        message="Boarding saved"
        type="success"
        onHide={() => setToastVisible(false)}
      />
      <Toast
        visible={!!errorToast}
        message={errorToast ?? ''}
        type="error"
        onHide={() => setErrorToast(null)}
      />
    </ScrollView>
  );
};

const RouteRow: React.FC<{ bus: MyRouteBus }> = ({ bus }) => (
  <View style={styles.routeRow}>
    <Ionicons name="bus-outline" size={18} color={Colors.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.routeBusNo}>
        {bus.busNo}
        {bus.routeName ? ` · ${bus.routeName}` : ''}
      </Text>
      <Text style={styles.routeMeta}>
        {bus.nextStopName ? `Next: ${bus.nextStopName}` : 'Location not live yet'}
        {bus.lastPingAt ? ` · ${new Date(bus.lastPingAt).toLocaleTimeString()}` : ''}
      </Text>
    </View>
  </View>
);

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
  routesSection: { marginTop: 24 },
  routesHint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkSoft,
    marginTop: 2,
    marginBottom: 12,
  },
  routesList: { marginTop: 12, gap: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeBusNo: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  routeMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
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
  saveBtnDisabled: { opacity: 0.45 },
  emptyRoster: { padding: 20 },
  emptyRosterText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyWrap: { alignItems: 'center', marginTop: 48, paddingHorizontal: 12, gap: 10 },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.ink },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
