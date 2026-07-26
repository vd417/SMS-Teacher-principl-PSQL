import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, ScreenHeader, Toast } from '../components';
import { useClass } from '@/features/classes/hooks';
import { useStudentsByClass } from '@/features/students/hooks';
import { useAttendance, useMarkAttendance } from '@/features/attendance/hooks';
import { deriveColorSet } from '@/theme/derive';
import { todayISO, formatLongDate, addDays } from '@/lib/date';
import type { AttendanceStatus, AttendanceRecord } from '@/data/domain';
import type { HomeStackParamList } from '../navigation/types';

type AttRoute = RouteProp<HomeStackParamList, 'AttendanceScreen'>;

type StudentAttendance = Record<string, AttendanceStatus>;

const STATUS_CYCLE: AttendanceStatus[] = ['P', 'A', 'L', 'V'];
const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: 'Present',
  A: 'Absent',
  L: 'Late',
  V: 'Leave',
};
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  P: Colors.present,
  A: Colors.absent,
  L: Colors.late,
  V: Colors.leave,
};
const STATUS_SOFT: Record<AttendanceStatus, string> = {
  P: Colors.presentSoft,
  A: Colors.absentSoft,
  L: Colors.lateSoft,
  V: Colors.leaveSoft,
};

const StatusBadge: React.FC<{ status: AttendanceStatus; onPress: () => void }> = ({
  status,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.8, { damping: 6, stiffness: 300 }, () => {
      scale.value = withSpring(1.1, { damping: 8, stiffness: 200 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 200 });
      });
    });
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        style={[
          styles.statusBadge,
          { backgroundColor: STATUS_SOFT[status], borderColor: STATUS_COLORS[status] },
        ]}
        activeOpacity={0.8}
      >
        <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>{status}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const AttendanceScreen: React.FC = () => {
  const route = useRoute<AttRoute>();
  const insets = useSafeAreaInsets();
  const { classId } = route.params;

  const [date, setDate] = useState<string>(() => todayISO());
  const today = todayISO();
  const goPrevDay = () => setDate((d) => addDays(d, -1));
  const goNextDay = () => setDate((d) => (d >= today ? d : addDays(d, 1)));

  const { data: cls, isLoading: clsLoading, isError: clsError } = useClass(classId);
  const {
    data: classStudents = [],
    isLoading: studentsLoading,
    isError: studentsError,
  } = useStudentsByClass(classId);
  const {
    data: attendanceRecords,
    isLoading: attLoading,
    isError: attError,
  } = useAttendance(classId, date);
  const mutation = useMarkAttendance(classId, date);

  const isLoading = clsLoading || studentsLoading || attLoading;
  const isError = clsError || studentsError || attError;

  const [attendance, setAttendance] = useState<StudentAttendance>({});
  const [toastVisible, setToastVisible] = useState(false);
  const [errorToastVisible, setErrorToastVisible] = useState(false);

  // Sync local state when attendance records arrive
  useEffect(() => {
    if (!attendanceRecords || classStudents.length === 0) return;
    const map: StudentAttendance = {};
    // Start with defaults for all students
    for (const s of classStudents) {
      map[s.id] = 'P';
    }
    // Override with loaded records
    for (const rec of attendanceRecords) {
      map[rec.studentId] = rec.status;
    }
    setAttendance(map);
  }, [attendanceRecords, classStudents]);

  const cycleStatus = (studentId: string) => {
    setAttendance((prev) => {
      const current = prev[studentId] ?? 'P';
      const idx = STATUS_CYCLE.indexOf(current);
      const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return { ...prev, [studentId]: next };
    });
  };

  const counts = {
    P: Object.values(attendance).filter((s) => s === 'P').length,
    A: Object.values(attendance).filter((s) => s === 'A').length,
    L: Object.values(attendance).filter((s) => s === 'L').length,
    V: Object.values(attendance).filter((s) => s === 'V').length,
  };

  const handleSubmit = () => {
    const records: AttendanceRecord[] = classStudents.map((s) => ({
      studentId: s.id,
      status: attendance[s.id] ?? 'P',
      date,
    }));
    mutation.mutate(records, {
      onSuccess: () => setToastVisible(true),
      onError: () => setErrorToastVisible(true),
    });
  };

  const markAllPresent = () => {
    const newState: StudentAttendance = {};
    for (const s of classStudents) {
      newState[s.id] = 'P';
    }
    setAttendance(newState);
  };

  const { color: clsColor } = cls ? deriveColorSet(cls.id) : { color: Colors.primary };

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isError || !cls) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={styles.errorText}>Failed to load attendance data</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title={`${cls.name}-${cls.section}`}
            subtitle={`Attendance · ${cls.subject}`}
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.dateBar}>
          <TouchableOpacity
            onPress={goPrevDay}
            style={styles.dateNav}
            accessibilityLabel="Previous day"
          >
            <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.dateLabel}>{formatLongDate(date)}</Text>
          <TouchableOpacity
            onPress={goNextDay}
            disabled={date >= today}
            style={[styles.dateNav, date >= today && styles.dateNavDisabled]}
            accessibilityLabel="Next day"
          >
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Bar */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsBar}>
          {(['P', 'A', 'L', 'V'] as AttendanceStatus[]).map((s) => (
            <View key={s} style={[styles.statItem, { backgroundColor: STATUS_SOFT[s] }]}>
              <Text style={[styles.statNum, { color: STATUS_COLORS[s] }]}>{counts[s]}</Text>
              <Text style={[styles.statLabel, { color: STATUS_COLORS[s] }]}>
                {STATUS_LABELS[s]}
              </Text>
            </View>
          ))}
        </Animated.View>

        {/* Mark All Present */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllPresent}>
            <Text style={styles.markAllText}>Mark All Present</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Empty state */}
        {classStudents.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No students in this class</Text>
          </View>
        )}

        {/* Students */}
        {classStudents.map((student, i) => (
          <Animated.View key={student.id} entering={FadeInDown.delay(160 + i * 30).springify()}>
            <View style={styles.studentRow}>
              <Avatar initials={student.initials} size={44} backgroundColor={clsColor} />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>Roll #{student.roll}</Text>
              </View>
              <StatusBadge
                status={attendance[student.id] ?? 'P'}
                onPress={() => cycleStatus(student.id)}
              />
            </View>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Submit FAB */}
      <View style={[styles.fab, { bottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={styles.fabBtn}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Text style={styles.fabText}>Submit Attendance</Text>
              <View style={styles.fabBadge}>
                <Text style={styles.fabBadgeText}>{classStudents.length}</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Toast
        visible={toastVisible}
        message="Attendance submitted successfully!"
        type="success"
        onHide={() => setToastVisible(false)}
      />
      <Toast
        visible={errorToastVisible}
        message="Failed to save attendance. Please try again."
        type="error"
        onHide={() => setErrorToastVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateNav: { padding: 8, borderRadius: 999, backgroundColor: Colors.primarySoft2 },
  dateNavDisabled: { opacity: 0.35 },
  dateLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  statsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  statItem: {
    flex: 1,
    borderRadius: Radii.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statNum: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
  markAllBtn: {
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  markAllText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    ...Shadows.card,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  studentRoll: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  statusBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  fabBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...Shadows.pop,
  },
  fabText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
  },
  fabBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: Radii.full,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  fabBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.white,
  },
});
