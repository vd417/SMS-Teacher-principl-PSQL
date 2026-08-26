import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, ScreenHeader, Toast } from '../components';
import { useClass } from '@/features/classes/hooks';
import { useStudentsByClass } from '@/features/students/hooks';
import {
  useClassDayTimetable,
  usePeriodAttendance,
  useMarkPeriodAttendance,
} from '@/features/attendance/hooks';
import { deriveColorSet, deriveSubjectColorSet } from '@/theme/derive';
import { todayISO, formatLongDate, addDays } from '@/lib/date';
import { attendancePeriodRows, lunchTimeLabel, localMinutes } from '@/lib/attendancePeriods';
import { classLabel } from '@/lib/classLabel';
import { slotsTaughtByTeacher } from '@/lib/homeworkSubjects';
import { useAuth } from '@/features/auth/AuthProvider';
import type { AttendanceStatus, AttendanceRecord } from '@/data/domain';
import type { ClassDayTimetableSlot } from '@/data/repositories/types';
import { isAppError } from '@/lib/errors';
import type { HomeStackParamList } from '../navigation/types';

type AttRoute = RouteProp<HomeStackParamList, 'AttendanceScreen'>;

type StudentAttendance = Record<string, AttendanceStatus>;

const STATUS_ORDER: AttendanceStatus[] = ['P', 'A', 'L', 'V'];
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

export function statusChipColors(
  code: AttendanceStatus,
  selected: boolean
): { backgroundColor: string; borderColor: string; color: string } {
  if (selected) {
    return {
      backgroundColor: STATUS_COLORS[code],
      borderColor: STATUS_COLORS[code],
      color: Colors.white,
    };
  }
  return {
    backgroundColor: STATUS_SOFT[code],
    borderColor: STATUS_COLORS[code],
    color: STATUS_COLORS[code],
  };
}

export function studentRowTint(status?: AttendanceStatus): string {
  return status ? STATUS_SOFT[status] : Colors.card;
}

export function periodTitle(slot: ClassDayTimetableSlot): string {
  return `P${slot.period} · ${slot.subject ?? '—'}`;
}

export function periodMeta(slot: ClassDayTimetableSlot): string {
  const time = slot.startTime && slot.endTime ? `${slot.startTime}–${slot.endTime}` : '';
  const teacher = slot.teacherName?.trim() ?? '';
  return [time, teacher].filter(Boolean).join(' · ');
}

export function rollLabel(roll: string | number | null | undefined): string | null {
  const trimmed = String(roll ?? '').trim();
  if (!trimmed || trimmed === '0') return null;
  return `Roll #${trimmed}`;
}

const StatusButtons: React.FC<{
  studentName: string;
  status?: AttendanceStatus;
  disabled: boolean;
  onSelect: (status: AttendanceStatus) => void;
}> = ({ studentName, status, disabled, onSelect }) => (
  <View style={styles.statusRow}>
    {STATUS_ORDER.map((code) => {
      const selected = status === code;
      const chip = statusChipColors(code, selected);
      return (
        <TouchableOpacity
          key={code}
          accessibilityLabel={`${studentName} ${STATUS_LABELS[code]}`}
          onPress={() => onSelect(code)}
          disabled={disabled}
          style={[
            styles.statusChip,
            {
              backgroundColor: chip.backgroundColor,
              borderColor: chip.borderColor,
            },
            disabled && styles.statusChipDisabled,
          ]}
          activeOpacity={0.8}
        >
          <Text style={[styles.statusChipText, { color: chip.color }]}>{STATUS_LABELS[code]}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export const AttendanceScreen: React.FC = () => {
  const route = useRoute<AttRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { classId } = route.params;
  const { session } = useAuth();
  const teacherName = session?.user.role === 'principal' ? null : session?.user.name;
  const goBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (goBackTimer.current) clearTimeout(goBackTimer.current);
    },
    []
  );

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
    data: slots = [],
    isLoading: slotsLoading,
    isError: slotsError,
  } = useClassDayTimetable(classId, date);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  useEffect(() => {
    setSelectedSlotId(null);
  }, [classId, date]);

  const nowMinutes = date === today ? localMinutes() : null;
  const mySlots = useMemo(() => slotsTaughtByTeacher(slots, teacherName), [slots, teacherName]);
  const periodRows = attendancePeriodRows(mySlots, nowMinutes);

  const selected = mySlots.find((s) => s.id === selectedSlotId) ?? null;
  const {
    data: attendanceRecords,
    isLoading: attLoading,
    isError: attError,
    refetch: refetchAttendance,
  } = usePeriodAttendance(classId, date, selected?.period ?? null, selected?.subject ?? null);
  const mutation = useMarkPeriodAttendance(
    classId,
    date,
    selected?.period ?? null,
    selected?.subject ?? null,
    selected?.subjectId,
    selected?.id
  );

  const listLoading = clsLoading || slotsLoading;
  const markLoading = Boolean(selected) && (studentsLoading || attLoading);
  const isError = clsError || slotsError || (Boolean(selected) && (studentsError || attError));

  const [attendance, setAttendance] = useState<StudentAttendance>({});
  const [dirty, setDirty] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('Attendance saved!');
  const [errorToastVisible, setErrorToastVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Failed to save attendance. Please try again.');

  useEffect(() => {
    setDirty(false);
  }, [date, classId, selectedSlotId]);

  useEffect(() => {
    if (dirty || !attendanceRecords || classStudents.length === 0) return;
    const map: StudentAttendance = {};
    for (const rec of attendanceRecords) {
      map[rec.studentId] = rec.status;
    }
    setAttendance(map);
  }, [attendanceRecords, classStudents, dirty]);

  const canMark = Boolean(selected?.canMark);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    if (!canMark) return;
    setDirty(true);
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  };

  const counts = {
    P: Object.values(attendance).filter((s) => s === 'P').length,
    A: Object.values(attendance).filter((s) => s === 'A').length,
    L: Object.values(attendance).filter((s) => s === 'L').length,
    V: Object.values(attendance).filter((s) => s === 'V').length,
  };
  const allStudentsMarked =
    classStudents.length > 0 &&
    classStudents.every((student) => attendance[student.id] !== undefined);

  const handleSubmit = () => {
    if (!canMark || !allStudentsMarked || !selected?.subject) return;
    const isUpdate = (attendanceRecords?.length ?? 0) > 0;
    const records: AttendanceRecord[] = classStudents.map((s) => ({
      studentId: s.id,
      status: attendance[s.id]!,
      date,
    }));
    mutation.mutate(records, {
      onSuccess: () => {
        setDirty(false);
        setToastMessage(isUpdate ? 'Attendance updated!' : 'Attendance submitted successfully!');
        setToastVisible(true);
        void refetchAttendance();
        if (!isUpdate) {
          goBackTimer.current = setTimeout(() => navigation.goBack(), 1000);
        }
      },
      onError: (err) => {
        setErrorMessage(
          isAppError(err)
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to save attendance. Please try again.'
        );
        setErrorToastVisible(true);
      },
    });
  };

  const markAllPresent = () => {
    if (!canMark) return;
    setDirty(true);
    const newState: StudentAttendance = {};
    for (const s of classStudents) {
      newState[s.id] = 'P';
    }
    setAttendance(newState);
  };

  const { color: clsColor } = cls ? deriveColorSet(cls.id) : { color: Colors.primary };
  const heading = cls ? classLabel(cls.name, cls.section) : '';

  const dateBar = (
    <Animated.View entering={FadeInDown.delay(70).springify()} style={styles.dateBar}>
      <TouchableOpacity
        onPress={goPrevDay}
        style={styles.dateNav}
        accessibilityLabel="Previous day"
      >
        <Ionicons name="chevron-back" size={18} color={Colors.primary} />
      </TouchableOpacity>
      <View style={styles.dateLabelWrap}>
        <Text style={styles.dateLabel}>{formatLongDate(date)}</Text>
      </View>
      <TouchableOpacity
        onPress={goNextDay}
        disabled={date >= today}
        style={[styles.dateNav, date >= today && styles.dateNavDisabled]}
        accessibilityLabel="Next day"
      >
        <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );

  if (listLoading) {
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

  if (!selected) {
    return (
      <View style={styles.flex}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <ScreenHeader title={heading} subtitle="Attendance" showBack />
          </Animated.View>
          {dateBar}
          {mySlots.length === 0 ? (
            <View style={styles.rollCallBanner}>
              <Text style={styles.rollCallBannerText}>
                {slots.length === 0
                  ? 'No teaching periods for this class today (Mon–Sat). Publish this class timetable in CRM Academics → Timetable.'
                  : 'No timetable periods assigned to you on this date.'}
              </Text>
            </View>
          ) : (
            periodRows.map((row, i) => {
              if (row.kind === 'lunch') {
                const time = lunchTimeLabel(row.startTime, row.endTime);
                return (
                  <Animated.View key="lunch" entering={FadeInDown.delay(80 + i * 30).springify()}>
                    <View
                      style={[styles.lunchCard, row.isCurrent && styles.lunchCardNow]}
                      accessibilityLabel={time ? `Lunch break ${time}` : 'Lunch break'}
                    >
                      <Ionicons name="restaurant-outline" size={20} color={Colors.late} />
                      <View style={styles.lunchCardText}>
                        <Text style={styles.lunchTitle}>Lunch break</Text>
                        {time ? <Text style={styles.lunchTime}>{time}</Text> : null}
                      </View>
                      {row.isCurrent ? (
                        <View style={[styles.currentPill, { backgroundColor: Colors.late }]}>
                          <Text style={styles.currentPillText}>NOW</Text>
                        </View>
                      ) : null}
                    </View>
                  </Animated.View>
                );
              }

              const slot = row.slot;
              const meta = periodMeta(slot);
              const cs = deriveSubjectColorSet(slot.subject ?? '');
              return (
                <Animated.View key={slot.id} entering={FadeInDown.delay(80 + i * 30).springify()}>
                  <TouchableOpacity
                    onPress={() => setSelectedSlotId(slot.id)}
                    style={[
                      styles.periodCard,
                      {
                        backgroundColor: cs.colorSoft,
                        borderColor: slot.isCurrent ? cs.color : cs.colorTint,
                      },
                      slot.isCurrent && styles.periodCardNow,
                    ]}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={periodTitle(slot)}
                  >
                    <View style={[styles.periodAccent, { backgroundColor: cs.color }]} />
                    <View style={styles.periodCardBody}>
                      <View style={styles.periodCardTop}>
                        <Text style={[styles.periodCardTitle, { color: cs.color }]}>
                          {periodTitle(slot)}
                        </Text>
                        <View style={styles.periodCardBadges}>
                          {slot.isCurrent ? (
                            <View style={[styles.currentPill, { backgroundColor: cs.color }]}>
                              <Text style={styles.currentPillText}>NOW</Text>
                            </View>
                          ) : null}
                          {slot.marked ? (
                            <Ionicons name="checkmark-circle" size={18} color={Colors.present} />
                          ) : null}
                        </View>
                      </View>
                      {meta ? <Text style={styles.periodCardMeta}>{meta}</Text> : null}
                      {!slot.canMark ? <Text style={styles.periodCardHint}>View only</Text> : null}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  if (markLoading) {
    return (
      <View style={[styles.flex, styles.center]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const markSubtitle = [
    periodTitle(selected),
    selected.startTime && selected.endTime ? `${selected.startTime}–${selected.endTime}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title={heading}
            subtitle={markSubtitle}
            showBack
            onBack={() => setSelectedSlotId(null)}
          />
        </Animated.View>

        {selected.marked && (
          <View style={styles.savedPill}>
            <Ionicons name="checkmark-circle" size={11} color={Colors.present} />
            <Text style={styles.savedPillText}>Already marked · tap to edit</Text>
          </View>
        )}

        {!canMark && (
          <Text style={styles.rollCallDeniedText}>
            Only the period teacher, class teacher, or leadership can mark this period
          </Text>
        )}

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsBar}>
          {STATUS_ORDER.map((s) => (
            <View key={s} style={[styles.statItem, { backgroundColor: STATUS_SOFT[s] }]}>
              <Text style={[styles.statNum, { color: STATUS_COLORS[s] }]}>{counts[s]}</Text>
              <Text style={[styles.statLabel, { color: STATUS_COLORS[s] }]}>
                {STATUS_LABELS[s]}
              </Text>
            </View>
          ))}
        </Animated.View>

        {canMark && (
          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllPresent}>
              <Text style={styles.markAllText}>Mark All Present</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {classStudents.length === 0 && (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No students in this class</Text>
          </View>
        )}

        {classStudents.map((student, i) => {
          const roll = rollLabel(student.roll);
          return (
            <Animated.View key={student.id} entering={FadeInDown.delay(160 + i * 30).springify()}>
              <View
                style={[
                  styles.studentRow,
                  { backgroundColor: studentRowTint(attendance[student.id]) },
                ]}
              >
                <View style={styles.studentHead}>
                  <Avatar initials={student.initials} size={44} backgroundColor={clsColor} />
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{student.name}</Text>
                    {roll ? <Text style={styles.studentRoll}>{roll}</Text> : null}
                  </View>
                </View>
                <StatusButtons
                  studentName={student.name}
                  status={attendance[student.id]}
                  disabled={!canMark}
                  onSelect={(status) => setStatus(student.id, status)}
                />
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {canMark && (
        <View style={[styles.fab, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity
            style={[styles.fabBtn, !allStudentsMarked && styles.fabBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={mutation.isPending || !allStudentsMarked}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.fabText}>
                  {attendanceRecords?.length ? 'Update Attendance' : 'Submit Attendance'}
                </Text>
                <View style={styles.fabBadge}>
                  <Text style={styles.fabBadgeText}>{classStudents.length}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type="success"
        onHide={() => setToastVisible(false)}
      />
      <Toast
        visible={errorToastVisible}
        message={errorMessage}
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
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  dateNav: { padding: 8, borderRadius: 999, backgroundColor: Colors.primarySoft2 },
  dateNavDisabled: { opacity: 0.35 },
  dateLabelWrap: { alignItems: 'center', gap: 3 },
  dateLabel: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  rollCallBanner: {
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
  },
  rollCallBannerText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.primary,
    textAlign: 'center',
  },
  periodCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.ruleSoft,
    ...Shadows.card,
  },
  periodCardNow: {
    borderWidth: 2.5,
    ...Shadows.pop,
  },
  lunchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.lateSoft,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.late,
  },
  lunchCardNow: {
    borderWidth: 2.5,
    ...Shadows.pop,
  },
  lunchCardText: {
    flex: 1,
    gap: 2,
  },
  lunchTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.ink,
  },
  lunchTime: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.inkMuted,
  },
  periodAccent: {
    width: 6,
  },
  periodCardBody: {
    flex: 1,
    padding: 16,
  },
  periodCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodCardTitle: {
    flex: 1,
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
  },
  periodCardBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentPill: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentPillText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: 0.4,
  },
  periodCardMeta: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 6,
  },
  periodCardHint: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 4,
  },
  rollCallDeniedText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.inkMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  savedPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.presentSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  savedPillText: { fontFamily: FontFamily.medium, fontSize: 10, color: Colors.present },
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
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    gap: 12,
    ...Shadows.card,
  },
  studentHead: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusChip: {
    flexGrow: 1,
    flexBasis: '22%',
    minHeight: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  statusChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
  },
  statusChipDisabled: {
    opacity: 0.55,
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
  fabBtnDisabled: {
    opacity: 0.45,
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
