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
import { FleetMap } from '../../components/transport/FleetMap';
import { useTransportFleet } from '@/features/principal/hooks';
import {
  useAssignBusTeacher,
  useUnassignBusTeacher,
  useAddTravelingTeacher,
  useRemoveTravelingTeacher,
  useTransportFleetPush,
} from '@/features/transport/hooks';
import { useRouteGeometry } from '@/features/transport/useRouteGeometry';
import { useSchoolStaffDirectory } from '@/features/staff/hooks';
import { isAppError } from '@/lib/errors';

export const PrincipalTransportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: fleet = [], isLoading, isError, refetch, isFetching } = useTransportFleet();
  const { members: staff = [] } = useSchoolStaffDirectory();
  const assign = useAssignBusTeacher();
  const unassign = useUnassignBusTeacher();
  const addTraveling = useAddTravelingTeacher();
  const removeTraveling = useRemoveTravelingTeacher();
  useTransportFleetPush(fleet.map((b) => b.busId));

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ busId: string; mode: 'duty' | 'traveling' } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const liveCount = useMemo(
    () => fleet.filter((b) => b.status === 'on_route' || b.status === 'at_stop').length,
    [fleet]
  );

  const pickerBus = fleet.find((b) => b.busId === picker?.busId);
  // FleetBus has no separate routeId field in this app's domain model (one bus == one route
  // here), so the bus's own id is passed as the route identifier for road-geometry lookup.
  const { data: selectedRouteGeometry } = useRouteGeometry(expandedId);

  const onPickTeacher = (teacherUserId: string) => {
    if (!picker) return;
    setErrorMsg(null);
    if (picker.mode === 'duty') {
      assign.mutate(
        { busId: picker.busId, teacherUserId },
        {
          onSuccess: () => {
            setPicker(null);
            setToast('Duty teacher assigned');
          },
          onError: (e) =>
            setErrorMsg(isAppError(e) ? e.message : 'Could not assign teacher. Try again.'),
        }
      );
    } else {
      addTraveling.mutate(
        { busId: picker.busId, teacherUserId },
        {
          onSuccess: () => {
            setPicker(null);
            setToast('Traveling teacher added');
          },
          onError: (e) =>
            setErrorMsg(isAppError(e) ? e.message : 'Could not add teacher. Try again.'),
        }
      );
    }
  };

  const onUnassign = (busId: string) => {
    setErrorMsg(null);
    unassign.mutate(busId, {
      onSuccess: () => setToast('Duty teacher removed'),
      onError: (e) =>
        setErrorMsg(isAppError(e) ? e.message : 'Could not remove assignment. Try again.'),
    });
  };

  const onRemoveTravelingTeacher = (busId: string, teacherUserId: string) => {
    setErrorMsg(null);
    removeTraveling.mutate(
      { busId, teacherUserId },
      {
        onSuccess: () => setToast('Traveling teacher removed'),
        onError: (e) =>
          setErrorMsg(isAppError(e) ? e.message : 'Could not remove teacher. Try again.'),
      }
    );
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
            <>
              <Animated.View entering={FadeInDown.delay(100).springify()}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.busChipRow}
                >
                  {fleet.map((bus) => {
                    const selected = expandedId === bus.busId;
                    return (
                      <TouchableOpacity
                        key={bus.busId}
                        style={[styles.busChip, selected && styles.busChipSelected]}
                        onPress={() => setExpandedId((id) => (id === bus.busId ? null : bus.busId))}
                      >
                        <Text style={[styles.busChipText, selected && styles.busChipTextSelected]}>
                          {bus.busNo}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.mapWrap}>
                <FleetMap
                  buses={fleet}
                  selectedBusId={expandedId}
                  onSelectBus={(busId) => setExpandedId((id) => (id === busId ? null : busId))}
                  routeGeometry={selectedRouteGeometry}
                />
              </Animated.View>
              {fleet.map((bus, i) => (
                <Animated.View
                  key={bus.busId}
                  entering={FadeInDown.delay(140 + i * 40).springify()}
                >
                  <Pressable
                    onPress={() => setExpandedId((id) => (id === bus.busId ? null : bus.busId))}
                  >
                    <FleetBusCard
                      bus={bus}
                      expanded={expandedId === bus.busId}
                      onAssign={() => setPicker({ busId: bus.busId, mode: 'duty' })}
                      onUnassign={() => onUnassign(bus.busId)}
                      assignBusy={assign.isPending || unassign.isPending}
                      onAddTravelingTeacher={() =>
                        setPicker({ busId: bus.busId, mode: 'traveling' })
                      }
                      onRemoveTravelingTeacher={(teacherUserId) =>
                        onRemoveTravelingTeacher(bus.busId, teacherUserId)
                      }
                      travelBusy={addTraveling.isPending || removeTraveling.isPending}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </>
          )}
        </TierGate>

        <Text style={styles.hint}>
          Assigned teachers open Bus Duty on their app to mark students boarded. Driver details come
          from the bus master in admin.
        </Text>
      </ScrollView>

      <Modal visible={picker != null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.modalTitle}>
              {picker?.mode === 'traveling' ? 'Add traveling teacher' : 'Assign duty teacher'}
            </Text>
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
                    disabled={assign.isPending || addTraveling.isPending}
                  >
                    <Text style={styles.staffName}>{member.name}</Text>
                    <Text style={styles.staffRole}>{member.roleLabel}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setPicker(null)}>
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
  mapWrap: { marginBottom: 16 },
  busChipRow: { gap: 8, paddingBottom: 10 },
  busChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  busChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  busChipText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink3 },
  busChipTextSelected: { color: Colors.white },
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
