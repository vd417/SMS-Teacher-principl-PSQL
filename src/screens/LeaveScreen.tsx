import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill, Toast } from '../components';
import { DatePickerField } from '../components/ui/DatePickerField';
import { LeaveAttachmentPicker } from '../components/leave/LeaveAttachmentPicker';
import { AttachmentThumbnails } from '../components/leave/AttachmentThumbnails';
import { useLeave, useApplyLeave } from '@/features/leave/hooks';
import { leaveSchema, LeaveSchemaType } from '../validation/schemas';
import type { NewLeaveInput } from '@/data/repositories/types';
import type { LeaveType, LeaveStatus } from '@/data/domain';

const TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  emergency: 'Emergency',
  other: 'Other',
};

const STATUS_COLORS: Record<LeaveStatus, string> = {
  approved: Colors.present,
  pending: Colors.late,
  rejected: Colors.absent,
};
const STATUS_SOFT: Record<LeaveStatus, string> = {
  approved: Colors.presentSoft,
  pending: Colors.lateSoft,
  rejected: Colors.absentSoft,
};

const LEAVE_TYPES: LeaveType[] = ['casual', 'sick', 'emergency', 'other'];

export const LeaveScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'apply' | 'history'>('apply');
  const [toastVisible, setToastVisible] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);

  const { data: leaveRequests = [], isLoading, isError, refetch } = useLeave();
  const applyMutation = useApplyLeave();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<LeaveSchemaType>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      type: 'casual',
      from: '',
      to: '',
      reason: '',
      substitute: '',
    },
  });

  const selectedType = watch('type');
  // suppress unused warning — selectedType used implicitly by the typeChipActive style
  void selectedType;

  const onSubmit = (data: LeaveSchemaType) => {
    const input: NewLeaveInput = {
      type: data.type,
      from: data.from,
      to: data.to,
      reason: data.reason,
      substitute: data.substitute || undefined,
      ...(attachmentUrls.length > 0 ? { attachmentUrls } : {}),
    };
    applyMutation.mutate(input, {
      onSuccess: () => {
        setToastVisible(true);
        reset();
        setAttachmentUrls([]);
      },
    });
  };

  const fromValue = watch('from');
  const toValue = watch('to');
  const minToDate = fromValue ? new Date(fromValue + 'T12:00:00') : undefined;

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader title="Leave Requests" subtitle="Apply and track" showBack />
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'apply' && styles.tabActive]}
            onPress={() => setTab('apply')}
          >
            <Text style={[styles.tabLabel, tab === 'apply' && styles.tabLabelActive]}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'history' && styles.tabActive]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabLabel, tab === 'history' && styles.tabLabelActive]}>
              History
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {tab === 'apply' ? (
          <>
            {/* Leave Type */}
            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.fieldGroup}>
              <Text style={styles.label}>Leave Type *</Text>
              <Controller
                control={control}
                name="type"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.typeGrid}>
                    {LEAVE_TYPES.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeChip, value === t && styles.typeChipActive]}
                        onPress={() => onChange(t)}
                      >
                        <Text
                          style={[styles.typeChipText, value === t && styles.typeChipTextActive]}
                        >
                          {TYPE_LABELS[t]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </Animated.View>

            {/* Dates */}
            <Animated.View entering={FadeInDown.delay(190).springify()} style={styles.row}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>From *</Text>
                <Controller
                  control={control}
                  name="from"
                  render={({ field: { onChange, value } }) => (
                    <DatePickerField
                      value={value}
                      onChange={onChange}
                      error={!!errors.from}
                      maximumDate={toValue ? new Date(toValue + 'T12:00:00') : undefined}
                    />
                  )}
                />
                {errors.from && <Text style={styles.errorText}>{errors.from.message}</Text>}
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>To *</Text>
                <Controller
                  control={control}
                  name="to"
                  render={({ field: { onChange, value } }) => (
                    <DatePickerField
                      value={value}
                      onChange={onChange}
                      error={!!errors.to}
                      minimumDate={minToDate}
                    />
                  )}
                />
                {errors.to && <Text style={styles.errorText}>{errors.to.message}</Text>}
              </View>
            </Animated.View>

            {/* Reason */}
            <Animated.View entering={FadeInDown.delay(230).springify()} style={styles.fieldGroup}>
              <Text style={styles.label}>Reason *</Text>
              <Controller
                control={control}
                name="reason"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={[styles.input, styles.textArea, errors.reason && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Describe the reason for your leave..."
                    placeholderTextColor={Colors.inkSoft}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                )}
              />
              {errors.reason && <Text style={styles.errorText}>{errors.reason.message}</Text>}
            </Animated.View>

            {/* Substitute */}
            <Animated.View entering={FadeInDown.delay(270).springify()} style={styles.fieldGroup}>
              <Text style={styles.label}>Substitute Teacher (Optional)</Text>
              <Controller
                control={control}
                name="substitute"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChange}
                    placeholder="Name of substitute teacher"
                    placeholderTextColor={Colors.inkSoft}
                  />
                )}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(290).springify()}>
              <LeaveAttachmentPicker urls={attachmentUrls} onChange={setAttachmentUrls} />
            </Animated.View>

            {/* Submit */}
            <Animated.View entering={FadeInDown.delay(310).springify()}>
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit(onSubmit)}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <>
            {isLoading && (
              <View style={styles.center}>
                <ActivityIndicator color={Colors.primary} />
              </View>
            )}

            {isError && (
              <View style={styles.center}>
                <Text style={styles.loadErrorText}>Failed to load leave history</Text>
              </View>
            )}

            {!isLoading && !isError && leaveRequests.length === 0 && (
              <View style={styles.center}>
                <Text style={styles.emptyText}>No leave requests yet</Text>
              </View>
            )}

            {leaveRequests.map((req, i) => (
              <Animated.View key={req.id} entering={FadeInDown.delay(150 + i * 60).springify()}>
                <View style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Pill
                      label={TYPE_LABELS[req.type]}
                      color={Colors.primary}
                      backgroundColor={Colors.primarySoft}
                      size="sm"
                    />
                    <Pill
                      label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      color={STATUS_COLORS[req.status]}
                      backgroundColor={STATUS_SOFT[req.status]}
                      size="sm"
                    />
                  </View>
                  <Text style={styles.historyDates}>
                    {req.from} → {req.to}
                  </Text>
                  <Text style={styles.historyReason}>{req.reason}</Text>
                  {req.substitute && (
                    <Text style={styles.historySub}>Substitute: {req.substitute}</Text>
                  )}
                  {req.attachmentUrls && req.attachmentUrls.length > 0 ? (
                    <AttachmentThumbnails urls={req.attachmentUrls} size={56} />
                  ) : null}
                  {req.status === 'rejected' && req.decidedNote ? (
                    <View style={styles.rejectionBox}>
                      <Text style={styles.rejectionLabel}>Rejection note</Text>
                      <Text style={styles.rejectionText}>{req.decidedNote}</Text>
                    </View>
                  ) : null}
                  <Text style={styles.historyApplied}>Applied on {req.appliedOn}</Text>
                </View>
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>

      <Toast
        visible={toastVisible}
        message="Leave application submitted!"
        type="success"
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  center: { paddingVertical: 40, alignItems: 'center' },
  loadErrorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.full,
    padding: 4,
    ...Shadows.card,
    marginBottom: 8,
  },
  tab: { flex: 1, borderRadius: Radii.full, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.inkMuted },
  tabLabelActive: { color: Colors.white },
  fieldGroup: { marginBottom: 8 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink3, marginBottom: 8 },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  textArea: { height: 100, paddingTop: 12 },
  inputError: { borderColor: Colors.absent },
  errorText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.absent, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.rule,
    backgroundColor: Colors.card,
  },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  typeChipTextActive: { color: Colors.white },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.pop,
  },
  submitBtnText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
  historyCard: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 16,
    ...Shadows.card,
    marginBottom: 8,
  },
  historyHeader: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  historyDates: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink, marginBottom: 6 },
  historyReason: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.ink3,
    lineHeight: 20,
    marginBottom: 6,
  },
  historySub: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 4,
  },
  historyApplied: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkSoft },
  rejectionBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: Radii.md,
    backgroundColor: Colors.absentSoft,
  },
  rejectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.absent,
    marginBottom: 4,
  },
  rejectionText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.ink3,
    lineHeight: 18,
  },
});
