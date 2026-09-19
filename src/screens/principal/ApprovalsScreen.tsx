import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar, Pill } from '../../components';
import { AttachmentThumbnails } from '../../components/leave/AttachmentThumbnails';
import { useApprovals, useDecideApproval } from '@/features/approvals/hooks';
import { isAppError } from '@/lib/errors';
import type { ApprovalListStatus } from '@/data/repositories/types';
import type { ApprovalRequest, LeaveStatus } from '@/data/domain';

const REJECT_REASONS = ['Substitute not arranged', 'Insufficient detail', 'Not approved'];

const FILTER_TABS: { key: ApprovalListStatus; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const PRIORITY_COLOR: Record<ApprovalRequest['priority'], string> = {
  high: Colors.absent,
  medium: Colors.late,
  low: Colors.present,
};

const STATUS_COLORS: Record<LeaveStatus, { color: string; soft: string }> = {
  pending: { color: Colors.late, soft: Colors.lateSoft },
  approved: { color: Colors.present, soft: Colors.presentSoft },
  rejected: { color: Colors.absent, soft: Colors.absentSoft },
};

export const ApprovalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ApprovalListStatus>('pending');
  const { data: approvals = [], isLoading } = useApprovals(filter);
  const decide = useDecideApproval();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onApprove = (id: string) => {
    setErrorMsg(null);
    decide.mutate(
      { id, decision: 'approved' },
      {
        onError: (e) =>
          setErrorMsg(isAppError(e) ? e.message : 'Could not update request. Try again.'),
      }
    );
  };

  const onReject = (id: string, note: string) => {
    const trimmed = note.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a rejection note.');
      return;
    }
    setRejectingId(null);
    setRejectNote('');
    setErrorMsg(null);
    decide.mutate(
      { id, decision: 'rejected', note: trimmed },
      {
        onError: (e) =>
          setErrorMsg(isAppError(e) ? e.message : 'Could not update request. Try again.'),
      }
    );
  };

  const emptyLabel =
    filter === 'pending'
      ? 'All caught up'
      : filter === 'approved'
        ? 'No approved requests yet'
        : 'No rejected requests yet';

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Approvals</Text>
        <Text style={styles.sub}>
          {approvals.length} {filter}
        </Text>

        <View style={styles.tabs}>
          {FILTER_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, filter === t.key && styles.tabActive]}
              onPress={() => {
                setFilter(t.key);
                setRejectingId(null);
                setRejectNote('');
                setErrorMsg(null);
              }}
            >
              <Text style={[styles.tabLabel, filter === t.key && styles.tabLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="warning" size={14} color={Colors.absent} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : approvals.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={48} color={Colors.present} />
            <Text style={styles.emptyText}>{emptyLabel}</Text>
          </View>
        ) : (
          approvals.map((req, i) => (
            <Animated.View
              key={req.id}
              entering={FadeInDown.delay(60 * i).springify()}
              exiting={FadeOut}
              style={styles.card}
            >
              <View style={styles.cardHead}>
                <Avatar initials={req.requesterInitials} size={40} />
                <View style={styles.cardHeadText}>
                  <Text style={styles.cardTitle}>{req.title}</Text>
                  <View style={styles.requesterRow}>
                    <Text style={styles.cardMeta}>{req.requesterName}</Text>
                    <Pill
                      label={req.requesterRole}
                      color={Colors.primary}
                      backgroundColor={Colors.primarySoft}
                      size="sm"
                    />
                  </View>
                </View>
                {filter === 'pending' ? (
                  <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[req.priority] }]} />
                ) : (
                  <Pill
                    label={req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    color={STATUS_COLORS[req.status].color}
                    backgroundColor={STATUS_COLORS[req.status].soft}
                    size="sm"
                  />
                )}
              </View>

              {req.from && req.to ? (
                <Text style={styles.dateRange}>
                  {req.from} → {req.to}
                </Text>
              ) : null}

              <Text style={styles.detail}>{req.detail}</Text>
              {req.reason ? (
                <Text style={styles.reason}>
                  {'"'}
                  {req.reason}
                  {'"'}
                </Text>
              ) : null}
              {req.substitute ? (
                <Text style={styles.sub2}>Substitute: {req.substitute}</Text>
              ) : null}
              {req.attachmentUrls && req.attachmentUrls.length > 0 ? (
                <AttachmentThumbnails urls={req.attachmentUrls} size={72} />
              ) : null}

              {req.status !== 'pending' && (req.decidedByName || req.decidedNote) ? (
                <View
                  style={[
                    styles.decisionBox,
                    req.status === 'rejected' ? styles.decisionRejected : styles.decisionApproved,
                  ]}
                >
                  {req.decidedByName ? (
                    <Text style={styles.decisionLabel}>
                      {req.status === 'rejected' ? 'Rejected by' : 'Approved by'}{' '}
                      {req.decidedByName}
                    </Text>
                  ) : (
                    <Text style={styles.decisionLabel}>
                      {req.status === 'rejected' ? 'Rejection note' : 'Decision note'}
                    </Text>
                  )}
                  {req.decidedNote ? (
                    <Text style={styles.decisionText}>{req.decidedNote}</Text>
                  ) : null}
                </View>
              ) : null}

              {filter === 'pending' && rejectingId === req.id ? (
                <View style={styles.reasonWrap}>
                  <Text style={styles.reasonLabel}>Reason for rejection *</Text>
                  <TextInput
                    style={styles.noteInput}
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    placeholder="Explain why this leave is rejected..."
                    placeholderTextColor={Colors.inkSoft}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                  {REJECT_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={styles.reasonChip}
                      onPress={() => setRejectNote(r)}
                    >
                      <Text style={styles.reasonChipText}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn, { marginTop: 4 }]}
                    onPress={() => onReject(req.id, rejectNote)}
                    disabled={decide.isPending}
                  >
                    <Text style={[styles.btnText, { color: Colors.white }]}>Confirm rejection</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setRejectingId(null);
                      setRejectNote('');
                    }}
                  >
                    <Text style={styles.cancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : filter === 'pending' ? (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => {
                      setRejectingId(req.id);
                      setRejectNote('');
                      setErrorMsg(null);
                    }}
                    disabled={decide.isPending}
                  >
                    <Ionicons name="close" size={16} color={Colors.absent} />
                    <Text style={[styles.btnText, { color: Colors.absent }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => onApprove(req.id)}
                    disabled={decide.isPending}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={[styles.btnText, { color: Colors.white }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
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
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 12 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.full,
    padding: 4,
    marginBottom: 16,
    ...Shadows.card,
  },
  tab: { flex: 1, borderRadius: Radii.full, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  tabLabelActive: { color: Colors.white },
  empty: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontFamily: FontFamily.semiBold, fontSize: 16, color: Colors.inkMuted },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeadText: { flex: 1 },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  requesterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  cardMeta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dateRange: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
    marginTop: 10,
  },
  detail: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.ink3, marginTop: 8 },
  reason: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  sub2: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted, marginTop: 6 },
  decisionBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: Radii.md,
  },
  decisionApproved: { backgroundColor: Colors.presentSoft },
  decisionRejected: { backgroundColor: Colors.absentSoft },
  decisionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.ink3,
    marginBottom: 4,
  },
  decisionText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.ink3,
    lineHeight: 18,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radii.full,
  },
  rejectBtn: { borderWidth: 1.5, borderColor: Colors.absentSoft, backgroundColor: Colors.white },
  approveBtn: { backgroundColor: Colors.primary, ...Shadows.card },
  btnText: { fontFamily: FontFamily.bold, fontSize: 14 },
  reasonWrap: { marginTop: 14, gap: 8 },
  reasonLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink3 },
  reasonChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.paper2,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  reasonChipText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.ink },
  noteInput: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.rule,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.ink,
    minHeight: 80,
  },
  cancel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.absent,
    flex: 1,
  },
});
