import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/features/auth/AuthProvider';
import { Colors } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { Card } from '@/components/ui/Card';
import { PunchButton } from '@/components/ui/PunchButton';
import { Toast } from '@/components/ui/Toast';
import {
  useMyAttendanceToday,
  usePunch,
  useSchoolLocation,
  useGeofenceAllowed,
  useStaffCheckInAllowed,
} from '@/features/teacherAttendance/hooks';
import { useAnnouncements } from '@/features/announcements/hooks';
import { useSchoolClosedToday } from '@/features/calendar/hooks';
import { formatTimeOfDay } from '@/lib/date';
import { formatPunchLabel, punchSuccessMessage, punchErrorMessage } from '@/lib/attendanceDisplay';

/** Self check-in card shared by Teacher and Principal Home. */
export const MyCheckInCard: React.FC = () => {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const { data: announcements = [] } = useAnnouncements();
  const schoolClosed = useSchoolClosedToday(announcements);
  const { data: myToday, isLoading: myTodayLoading } = useMyAttendanceToday();
  const { data: schoolLocation } = useSchoolLocation();
  const punch = usePunch();
  const schoolConfigured = schoolLocation != null;
  const { allowed: geofenceAllowed } = useGeofenceAllowed();
  const { allowed: staffCheckInAllowed } = useStaffCheckInAllowed();
  const punchOpts = { geo: geofenceAllowed, schoolConfigured };
  const [punchToast, setPunchToast] = useState<{
    msg: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const canCheckIn = !myTodayLoading && !myToday?.checkIn;
  const myLatestPunch = myToday?.checkOut ?? myToday?.checkIn;

  if (!staffCheckInAllowed) return null;

  const handlePunch = () => {
    punch.mutate('in', {
      onSuccess: (day) => {
        const ev = day.checkIn;
        const { msg, type } = punchSuccessMessage('in', ev, punchOpts);
        setPunchToast({ msg, type });
      },
      onError: (e) =>
        setPunchToast({
          msg: punchErrorMessage(e),
          type: 'error',
        }),
    });
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          isPrincipal
            ? navigation.navigate('MyAttendanceScreen')
            : navigation.getParent()?.navigate('Profile', { screen: 'MyAttendanceScreen' })
        }
      >
        <Card style={styles.myAttCard}>
          <View style={styles.myAttHeader}>
            <Ionicons
              name={geofenceAllowed ? 'location' : 'finger-print-outline'}
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.myAttTitle}>My Attendance</Text>
          </View>
          {schoolClosed && (
            <Text style={styles.myAttClosedHint}>
              School is closed today — check-in is disabled.
            </Text>
          )}
          {myLatestPunch && (
            <View style={styles.myAttHint}>
              <Ionicons
                name={geofenceAllowed ? 'location' : 'time-outline'}
                size={12}
                color={Colors.inkMuted}
              />
              <Text style={styles.myAttHintText}>{formatPunchLabel(myLatestPunch, punchOpts)}</Text>
            </View>
          )}
          {canCheckIn ? (
            <PunchButton
              label="Check In"
              icon="enter-outline"
              onPress={handlePunch}
              loading={punch.isPending}
              disabled={!!schoolClosed}
            />
          ) : (
            myToday?.checkIn && (
              <View style={styles.myAttDone}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.present} />
                <Text style={styles.myAttDoneText}>
                  {myToday.checkOut ? 'Checked out' : 'Checked in'} at{' '}
                  {formatTimeOfDay((myToday.checkOut ?? myToday.checkIn)?.at)}
                </Text>
              </View>
            )
          )}
        </Card>
      </TouchableOpacity>
      <Toast
        visible={!!punchToast}
        message={punchToast?.msg ?? ''}
        type={punchToast?.type ?? 'success'}
        onHide={() => setPunchToast(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  myAttCard: { marginTop: 12, padding: 16 },
  myAttHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  myAttTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink, flex: 1 },
  myAttHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  myAttHintText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.inkMuted },
  myAttClosedHint: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.absent,
    marginBottom: 8,
  },
  myAttDone: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  myAttDoneText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.present },
});
