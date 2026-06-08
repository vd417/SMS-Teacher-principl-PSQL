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
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar } from '../../components';
import { useApprovals, useDecideApproval } from '@/features/approvals/hooks';
import type { ApprovalRequest } from '@/data/domain';

const REJECT_REASONS = ['Substitute not arranged', 'Insufficient detail', 'Not approved'];

const PRIORITY_COLOR: Record<ApprovalRequest['priority'], string> = {
  high: Colors.absent,
  medium: Colors.late,
  low: Colors.present,
};

export const ApprovalsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: approvals = [], isLoading } = useApprovals();
  const decide = useDecideApproval();
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const pending = approvals.filter((a) => a.status === 'pending');

  const onApprove = (id: string) => decide.mutate({ id, decision: 'approved' });
  const onReject = (id: string, note: string) => {
    setRejectingId(null);
    decide.mutate({ id, decision: 'rejected', note });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Approvals</Text>
        <Text style={styles.sub}>{pending.length} pending</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : pending.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={48} color={Colors.present} />
            <Text style={styles.emptyText}>All caught up</Text>
          </View>
        ) : (
          pending.map((req, i) => (
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
                  <Text style={styles.cardMeta}>{req.requesterName}</Text>
                </View>
                <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[req.priority] }]} />
              </View>

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

              {rejectingId === req.id ? (
                <View style={styles.reasonWrap}>
                  <Text style={styles.reasonLabel}>Reason for rejection</Text>
                  {REJECT_REASONS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={styles.reasonChip}
                      onPress={() => onReject(req.id, r)}
                    >
                      <Text style={styles.reasonChipText}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setRejectingId(null)}>
                    <Text style={styles.cancel}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn]}
                    onPress={() => setRejectingId(req.id)}
                  >
                    <Ionicons name="close" size={16} color={Colors.absent} />
                    <Text style={[styles.btnText, { color: Colors.absent }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => onApprove(req.id)}
                  >
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                    <Text style={[styles.btnText, { color: Colors.white }]}>Approve</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  cardMeta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  dot: { width: 10, height: 10, borderRadius: 5 },
  detail: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.ink3, marginTop: 12 },
  reason: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  sub2: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted, marginTop: 6 },
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
  cancel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
