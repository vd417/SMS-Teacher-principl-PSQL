import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import type { FleetBus, FleetBusStatus } from '@/data/domain';

const STATUS_LABEL: Record<FleetBusStatus, string> = {
  idle: 'Idle',
  on_route: 'On route',
  at_stop: 'At stop',
  delayed: 'Delayed',
};

const STATUS_COLOR: Record<FleetBusStatus, string> = {
  idle: Colors.inkMuted,
  on_route: Colors.primary,
  at_stop: Colors.present,
  delayed: Colors.absent,
};

type Props = {
  bus: FleetBus;
  expanded?: boolean;
  onAssign?: () => void;
  onUnassign?: () => void;
  assignBusy?: boolean;
};

export const FleetBusCard: React.FC<Props> = ({
  bus,
  expanded,
  onAssign,
  onUnassign,
  assignBusy,
}) => (
  <View style={styles.card}>
    <View style={styles.head}>
      <View style={styles.busIcon}>
        <Ionicons name="bus" size={20} color={Colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>
          {bus.busNo}
          {bus.routeName ? ` · ${bus.routeName}` : ''}
        </Text>
        <Text style={styles.meta}>
          Driver: {bus.driver?.trim() || 'Not set'}
          {bus.driverPhone ? ` · ${bus.driverPhone}` : ''}
        </Text>
      </View>
      <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[bus.status] + '22' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[bus.status] }]}>
          {STATUS_LABEL[bus.status]}
        </Text>
      </View>
    </View>

    <View style={styles.stats}>
      <Text style={styles.stat}>
        {bus.studentsRiding} aboard · {bus.stopCount} stops
      </Text>
      {bus.nextStopName ? <Text style={styles.stat}>Next: {bus.nextStopName}</Text> : null}
      {bus.lastPingAt ? (
        <Text style={styles.statMuted}>
          Last ping: {new Date(bus.lastPingAt).toLocaleTimeString()}
        </Text>
      ) : null}
    </View>

    <View style={styles.dutyRow}>
      <Ionicons name="person-outline" size={16} color={Colors.inkMuted} />
      <Text style={styles.dutyText}>Duty teacher: {bus.teacherName?.trim() || 'Unassigned'}</Text>
    </View>

    {expanded ? (
      <View style={styles.actions}>
        {bus.driverPhone ? (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => Linking.openURL(`tel:${bus.driverPhone}`)}
          >
            <Ionicons name="call-outline" size={16} color={Colors.primary} />
            <Text style={styles.secondaryBtnText}>Call driver</Text>
          </TouchableOpacity>
        ) : null}
        {bus.teacherUserId ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onUnassign} disabled={assignBusy}>
            <Text style={styles.unassignText}>Remove teacher</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={onAssign} disabled={assignBusy}>
          <Text style={styles.primaryBtnText}>
            {bus.teacherUserId ? 'Change duty teacher' : 'Assign duty teacher'}
          </Text>
        </TouchableOpacity>
      </View>
    ) : null}

    {bus.lat != null && bus.lng != null ? (
      <Text style={styles.coords}>
        GPS {bus.lat.toFixed(5)}, {bus.lng.toFixed(5)}
        {bus.speedKmh != null ? ` · ${Math.round(bus.speedKmh)} km/h` : ''}
      </Text>
    ) : (
      <Text style={styles.coordsMuted}>No live GPS ping yet</Text>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.ruleSoft,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  busIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  statusPill: { borderRadius: Radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontFamily: FontFamily.semiBold, fontSize: 11 },
  stats: { marginTop: 10, gap: 2 },
  stat: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.ink3 },
  statMuted: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkSoft },
  dutyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  dutyText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.ink3, flex: 1 },
  actions: { marginTop: 12, gap: 8 },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  secondaryBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  unassignText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.absent },
  coords: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.inkSoft, marginTop: 8 },
  coordsMuted: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.inkSoft,
    marginTop: 8,
  },
});
