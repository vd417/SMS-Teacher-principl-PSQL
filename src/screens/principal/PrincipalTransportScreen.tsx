import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { ScreenHeader, TierGate, Toast } from '../../components';
import { FleetBusCard } from '../../components/transport/FleetBusCard';
import { useTransportFleet } from '@/features/principal/hooks';
import { useAssignBusTeacher, useUnassignBusTeacher } from '@/features/transport/hooks';
import { useSchoolStaffDirectory } from '@/features/staff/hooks';
import { isAppError } from '@/lib/errors';

export const PrincipalTransportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: fleet = [], isLoading, isError, refetch, isFetching } = useTransportFleet();
  const { data: staff = [] } = useSchoolStaffDirectory();
  const assign = useAssignBusTeacher();
  const unassign = useUnassignBusTeacher();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerBusId, setPickerBusId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const liveCount = useMemo(
    () => fleet.filter((b) => b.status === 'on_route' || b.status === 'at_stop').length,
    [fleet]
  );

  const pickerBus = fleet.find((b) => b.busId === pickerBusId);

  const onPickTeacher = (teacherUserId: string) => {
    if (!pickerBusId) return;
    setErrorMsg(null);
    assign.mutate(
      { busId: pickerBusId, teacherUserId },
      {
        onSuccess: () => {
          setPickerBusId(null);
          setToast('Duty teacher assigned');
        },
        onError: (e) =>
          setErrorMsg(isAppError(e) ? e.message : 'Could not assign teacher. Try again.'),
      }
    );
  };

  const onUnassign = (busId: string) => {
    setErrorMsg(null);
    unassign.mutate(busId, {
      onSuccess: () => setToast('Duty teacher removed'),
      onError: (e) =>
        setErrorMsg(isAppError(e) ? e.message : 'Could not remove assignment. Try again.'),
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
          <ScreenHeader
            title="Live Bus Fleet"
            subtitle="Assign duty teachers · monitor routes"
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).springify()} style={styles.summary}>
          <Text style={styles.summaryNum}>{fleet.length}</Text>
          <Text style={styles.summaryLbl}>buses</Text>
          <View style={styles.summaryDivider} />
          <Text style={[styles.summaryNum, { color: Colors.present }]}>{liveCount}</Text>
          <Text style={styles.summaryLbl}>live now</Text>
          {isFetching ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginLeft: 8 }} />
          ) : null}
        </Animated.View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={14} color={Colors.absent} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        <TierGate
          feature="transport.gps"
          title="Live GPS fleet board"
          blurb="Real-time bus movement requires the Platinum plan."
          minHeight={120}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
          ) : isError ? (
            <TouchableOpacity style={styles.retry} onPress={() => refetch()}>
              <Text style={styles.retryText}>Could not load fleet. Tap to retry.</Text>
            </TouchableOpacity>
          ) : fleet.length === 0 ? (
            <Text style={styles.empty}>No buses configured for this school yet.</Text>
          ) : (
            fleet.map((bus, i) => (
              <Animated.View key={bus.busId} entering={FadeInDown.delay(100 + i * 40).springify()}>
                <Pressable
                  onPress={() => setExpandedId((id) => (id === bus.busId ? null : bus.busId))}
                >
                  <FleetBusCard
                    bus={bus}
                    expanded={expandedId === bus.busId}
                    onAssign={() => setPickerBusId(bus.busId)}
                    onUnassign={() => onUnassign(bus.busId)}
                    assignBusy={assign.isPending || unassign.isPending}
                  />
                </Pressable>
              </Animated.View>
            ))
          )}
        </TierGate>

        <Text style={styles.hint}>
          Assigned teachers open Bus Duty on their app to mark students boarded. Driver details come
          from the bus master in admin.
        </Text>
      </ScrollView>

      <Modal visible={pickerBusId != null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.modalTitle}>Assign duty teacher</Text>
            {pickerBus ? (
              <Text style={styles.modalSub}>
                {pickerBus.busNo}
                {pickerBus.routeName ? ` · ${pickerBus.routeName}` : ''}
              </Text>
            ) : null}
            <ScrollView style={{ maxHeight: 360 }}>
              {staff.length === 0 ? (
                <Text style={styles.staffEmpty}>
                  No staff found. Add teachers in admin before assigning bus duty.
                </Text>
              ) : (
                staff.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    style={styles.staffRow}
                    onPress={() => onPickTeacher(member.id)}
                    disabled={assign.isPending}
                  >
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffRole}>{member.roleLabel}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setPickerBusId(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast visible={!!toast} message={toast ?? ''} type="success" onHide={() => setToast(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
    padding: 14,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
  },
  summaryNum: { fontFamily: FontFamily.extraBold, fontSize: 22, color: Colors.ink },
  summaryLbl: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  summaryDivider: { width: 1, height: 28, backgroundColor: Colors.rule, marginHorizontal: 8 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.absent, flex: 1 },
  empty: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted, marginTop: 24 },
  retry: { marginTop: 24, padding: 12 },
  retryText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkSoft,
    lineHeight: 18,
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.ink },
  modalSub: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 12,
  },
  staffRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  staffName: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.ink },
  staffRole: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  staffEmpty: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    paddingVertical: 24,
    lineHeight: 20,
  },
  modalCancel: { alignItems: 'center', paddingVertical: 14 },
  modalCancelText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.primary },
});
