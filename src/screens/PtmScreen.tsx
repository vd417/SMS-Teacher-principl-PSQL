import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill, Toast } from '../components';
import { usePtmMeetings, useDeletePtm } from '@/features/ptm/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { isAppError } from '@/lib/errors';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import type { PtmMeeting, PtmStatus } from '@/data/domain';
import type { HomeStackParamList } from '../navigation/types';

type PtmNav = NativeStackNavigationProp<HomeStackParamList, 'PtmScreen'>;

const STATUS_LABELS: Record<PtmStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
};
const STATUS_COLORS: Record<PtmStatus, string> = {
  pending: Colors.late,
  confirmed: Colors.present,
};
const STATUS_SOFT: Record<PtmStatus, string> = {
  pending: Colors.lateSoft,
  confirmed: Colors.presentSoft,
};

function sortByDateTime(meetings: PtmMeeting[]): PtmMeeting[] {
  return [...meetings].sort((a, b) => {
    const da = `${a.date}T${a.time}`;
    const db = `${b.date}T${b.time}`;
    return da.localeCompare(db);
  });
}

export const PtmScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PtmNav>();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const { data: meetings = [], isLoading, isError, refetch } = usePtmMeetings();
  const deletePtm = useDeletePtm();
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const sorted = sortByDateTime(meetings);

  const onCancel = (meeting: PtmMeeting) => {
    Alert.alert(
      'Cancel meeting?',
      `Cancel the PTM with ${meeting.studentName} on ${meeting.date} at ${meeting.time}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel',
          style: 'destructive',
          onPress: () =>
            deletePtm.mutate(meeting.id, {
              onError: (e) =>
                setErrorToast(
                  isAppError(e) ? e.message : 'Could not cancel the meeting. Try again.'
                ),
            }),
        },
      ]
    );
  };

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title="Parent-Teacher Meetings"
            subtitle={`${sorted.length} meeting${sorted.length === 1 ? '' : 's'}`}
            showBack
            rightComponent={
              isPrincipal ? undefined : (
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => navigation.navigate('PtmNewScreen')}
                  accessibilityLabel="New meeting"
                >
                  <Ionicons name="add" size={22} color={Colors.white} />
                </TouchableOpacity>
              )
            }
          />
        </Animated.View>

        {isLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={90} radius={12} />
            ))}
          </>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : sorted.length === 0 ? (
          <EmptyState label="No parent-teacher meetings scheduled yet." />
        ) : (
          sorted.map((meeting, i) => (
            <Animated.View key={meeting.id} entering={FadeInDown.delay(100 + i * 60).springify()}>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.studentName} numberOfLines={1}>
                    {meeting.studentName}
                  </Text>
                  <Pill
                    label={STATUS_LABELS[meeting.status]}
                    color={STATUS_COLORS[meeting.status]}
                    backgroundColor={STATUS_SOFT[meeting.status]}
                    size="sm"
                  />
                </View>
                <Text style={styles.subject}>{meeting.subject || '—'}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{meeting.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{meeting.time}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="videocam-outline" size={13} color={Colors.inkMuted} />
                    <Text style={styles.metaText}>{meeting.mode}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => onCancel(meeting)}
                  disabled={deletePtm.isPending}
                >
                  <Text style={styles.cancelBtnText}>Cancel meeting</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
      <Toast
        visible={!!errorToast}
        message={errorToast ?? ''}
        type="error"
        onHide={() => setErrorToast(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentName: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    flex: 1,
    marginRight: 8,
  },
  subject: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  cancelBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.absentSoft,
  },
  cancelBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.absent },
});
