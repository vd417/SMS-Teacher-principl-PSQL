import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill, Toast } from '../components';
import { usePtmMeetings, useDeletePtm, usePtmClassLabels } from '@/features/ptm/hooks';
import { useSchoolTeachers } from '@/features/teachers/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { isAppError } from '@/lib/errors';
import {
  groupPtmSlots,
  type PtmClassGroup,
  type PtmSectionGroup,
  type PtmSlot,
} from '@/lib/ptmGroups';
import { openMeetingLink } from '@/lib/meetingLink';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import type { PtmMeeting, PtmStatus } from '@/data/domain';

type PtmNav = NativeStackNavigationProp<{ PtmScreen: undefined; PtmNewScreen: undefined }>;

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

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const PtmScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<PtmNav>();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const { data: meetings = [], isLoading, isError, refetch } = usePtmMeetings();
  const deletePtm = useDeletePtm();
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [slotKey, setSlotKey] = useState<string | null>(null);
  const [classKey, setClassKey] = useState<string | null>(null);
  const [sectionKey, setSectionKey] = useState<string | null>(null);
  const [cancelSlot, setCancelSlot] = useState<PtmSlot | null>(null);
  const [cancelStep, setCancelStep] = useState<'confirm' | 'reason'>('confirm');
  const [reason, setReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [allTeachers, setAllTeachers] = useState(false);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const { data: teachers = [] } = useSchoolTeachers();

  const { placements, isLoading: placementsLoading } = usePtmClassLabels(
    meetings.map((meeting) => meeting.studentId)
  );
  const visibleMeetings = useMemo(
    () => meetings.filter((meeting) => !removedIds.includes(meeting.id)),
    [meetings, removedIds]
  );
  const slots = useMemo(
    () => groupPtmSlots(visibleMeetings, placements),
    [visibleMeetings, placements]
  );
  const selectedSlot = slots.find((slot) => slot.key === slotKey) ?? null;
  const selectedClass = selectedSlot?.classes.find((group) => group.classKey === classKey) ?? null;
  const selectedSection =
    selectedClass?.sections.find((section) => section.sectionKey === sectionKey) ?? null;
  const showClasses = selectedSlot != null && selectedSlot.classes.length > 1 && !selectedClass;

  const openSlot = (slot: PtmSlot) => {
    setSlotKey(slot.key);
    setSectionKey(null);
    setClassKey(slot.classes.length === 1 ? slot.classes[0].classKey : null);
  };

  const onOpenLink = async (link: string) => {
    const opened = await openMeetingLink(link);
    if (!opened) setToast({ message: 'Could not open that meeting link.', type: 'error' });
  };

  const closeCancel = () => {
    if (deletePtm.isPending) return;
    setCancelSlot(null);
    setCancelError(null);
  };

  const askCancel = (slot: PtmSlot) => {
    const ids = [
      ...new Set(
        slot.meetings.map((meeting) => meeting.teacherId).filter((id): id is string => Boolean(id))
      ),
    ];
    setReason('');
    setCancelError(null);
    setCancelStep('confirm');
    setTeacherIds(ids);
    setAllTeachers(ids.length === 0);
    setCancelSlot(slot);
  };

  const confirmCancel = () => {
    const slot = cancelSlot;
    const note = reason.trim();
    if (!slot) return;
    if (!note) {
      setCancelError('Type a reason to cancel this meeting.');
      return;
    }
    if (!allTeachers && teacherIds.length === 0) {
      setCancelError('Select a teacher, or choose All teachers.');
      return;
    }
    setCancelError(null);
    const ids = slot.meetings.map((meeting) => meeting.id);
    setRemovedIds((current) => [...new Set([...current, ...ids])]);
    setCancelSlot(null);
    setReason('');
    setSlotKey(null);
    setClassKey(null);
    setSectionKey(null);
    setToast({
      message: `Notice sent to the parent, the teacher app, and CRM: ${note}`,
      type: 'success',
    });
    deletePtm.mutate(
      { ids, reason: note, teacherIds: allTeachers ? [] : teacherIds, allTeachers },
      {
        onError: (e) => {
          setRemovedIds((current) => current.filter((id) => !ids.includes(id)));
          setToast({
            message: isAppError(e) ? e.message : 'Could not cancel the meeting. Try again.',
            type: 'error',
          });
        },
      }
    );
  };

  const onBack = selectedSection
    ? () => setSectionKey(null)
    : selectedClass && selectedSlot && selectedSlot.classes.length > 1
      ? () => setClassKey(null)
      : selectedSlot
        ? () => {
            setSlotKey(null);
            setClassKey(null);
            setSectionKey(null);
          }
        : undefined;

  const title = selectedSection
    ? selectedSection.sectionTitle
    : selectedClass && !showClasses
      ? selectedClass.classTitle
      : selectedSlot
        ? selectedSlot.subject?.trim() || selectedSlot.teacher
        : 'Parent-Teacher Meetings';
  const subtitle = selectedSection
    ? `${selectedClass?.classTitle ?? ''} · ${countLabel(selectedSection.meetings.length, 'student', 'students')}`
    : showClasses
      ? 'All classes · choose a class'
      : selectedClass
        ? `${selectedSlot?.subject?.trim() || 'Meeting'} · choose a section`
        : isPrincipal
          ? 'Any class in this school'
          : 'Your assigned class or subject';

  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title={title}
            subtitle={subtitle}
            showBack
            onBack={onBack}
            rightComponent={
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => navigation.navigate('PtmNewScreen')}
                accessibilityLabel="New meeting"
              >
                <Ionicons name="add" size={22} color={Colors.white} />
              </TouchableOpacity>
            }
          />
        </Animated.View>

        {isLoading || placementsLoading ? (
          <>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={90} radius={12} />
            ))}
          </>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : visibleMeetings.length === 0 ? (
          <EmptyState label="No parent-teacher meetings scheduled yet." />
        ) : selectedSection ? (
          <>
            {selectedSlot?.meetingLink ? (
              <MeetingLinkButton
                link={selectedSlot.meetingLink}
                onPress={() => onOpenLink(selectedSlot.meetingLink!)}
              />
            ) : null}
            {selectedSection.meetings.map((meeting, i) => (
              <StudentRow key={meeting.id} meeting={meeting} index={i} />
            ))}
            {selectedSlot ? (
              <CancelButton
                onPress={() => askCancel(selectedSlot)}
                disabled={deletePtm.isPending}
              />
            ) : null}
          </>
        ) : showClasses && selectedSlot ? (
          selectedSlot.classes.map((group, i) => (
            <ClassRow
              key={group.classKey}
              group={group}
              index={i}
              onPress={() => {
                setClassKey(group.classKey);
                setSectionKey(null);
              }}
            />
          ))
        ) : selectedClass ? (
          selectedClass.sections.map((section, i) => (
            <SectionRow
              key={section.sectionKey}
              section={section}
              index={i}
              onPress={() => setSectionKey(section.sectionKey)}
            />
          ))
        ) : (
          slots.map((slot, i) => (
            <SlotRow
              key={slot.key}
              slot={slot}
              index={i}
              onPress={() => openSlot(slot)}
              onOpenLink={() => onOpenLink(slot.meetingLink!)}
              onCancel={() => askCancel(slot)}
              cancelDisabled={deletePtm.isPending}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={cancelSlot != null}
        transparent
        animationType="fade"
        onRequestClose={closeCancel}
      >
        <View style={styles.backdrop}>
          <Pressable
            style={styles.backdropTap}
            onPress={closeCancel}
            accessibilityLabel="Close cancel"
          />
          <View style={styles.sheet}>
            {cancelStep === 'confirm' ? (
              <>
                <Text style={styles.sheetTitle}>Cancel this meeting?</Text>
                <Text style={styles.sheetHint}>
                  Next you will type a reason. Cancelling notifies the parent and the teacher.
                </Text>
                <View style={styles.sheetActions}>
                  <TouchableOpacity onPress={closeCancel} style={styles.sheetSecondary}>
                    <Text style={styles.sheetSecondaryText}>Not now</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setCancelStep('reason')}
                    style={styles.sheetDanger}
                    accessibilityLabel="Continue"
                  >
                    <Text style={styles.sheetDangerText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Reason for cancelling</Text>
                <Text style={styles.sheetHint}>
                  The reason is sent to the parent, the teacher app, and CRM. Then the meeting
                  disappears.
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={(value) => {
                    setReason(value);
                    if (cancelError) setCancelError(null);
                  }}
                  placeholder="Type the reason"
                  placeholderTextColor={Colors.inkSoft}
                  style={styles.reasonInput}
                  multiline
                  autoFocus
                />
                <Text style={styles.teacherLabel}>Teachers</Text>
                <ScrollView style={styles.teacherList} keyboardShouldPersistTaps="handled">
                  <TouchableOpacity
                    style={styles.teacherRow}
                    onPress={() => {
                      setAllTeachers((current) => !current);
                      setTeacherIds([]);
                    }}
                  >
                    <Text style={styles.teacherName}>All teachers</Text>
                    {allTeachers ? (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                  {teachers.map((teacher) => {
                    const checked = !allTeachers && teacherIds.includes(teacher.id);
                    return (
                      <TouchableOpacity
                        key={teacher.id}
                        style={styles.teacherRow}
                        onPress={() => {
                          setAllTeachers(false);
                          setTeacherIds((current) =>
                            current.includes(teacher.id)
                              ? current.filter((id) => id !== teacher.id)
                              : [...current, teacher.id]
                          );
                        }}
                      >
                        <Text style={styles.teacherName}>{teacher.name}</Text>
                        {checked ? (
                          <Ionicons name="checkmark" size={18} color={Colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {cancelError ? <Text style={styles.sheetError}>{cancelError}</Text> : null}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    onPress={() => setCancelStep('confirm')}
                    style={styles.sheetSecondary}
                  >
                    <Text style={styles.sheetSecondaryText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={confirmCancel}
                    disabled={deletePtm.isPending}
                    style={[styles.sheetDanger, deletePtm.isPending && styles.sheetDangerDisabled]}
                    accessibilityLabel="Cancel and notify"
                  >
                    <Text style={styles.sheetDangerText}>
                      {deletePtm.isPending ? 'Cancelling…' : 'Cancel and notify'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Toast
        visible={!!toast}
        message={toast?.message ?? ''}
        type={toast?.type ?? 'error'}
        onHide={() => setToast(null)}
      />
    </>
  );
};

const SlotRow: React.FC<{
  slot: PtmSlot;
  index: number;
  onPress: () => void;
  onOpenLink: () => void;
  onCancel: () => void;
  cancelDisabled: boolean;
}> = ({ slot, index, onPress, onOpenLink, onCancel, cancelDisabled }) => (
  <Animated.View entering={FadeInDown.delay(100 + index * 60).springify()}>
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${slot.teacher} ${slot.subject ?? ''}`.trim()}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.studentName} numberOfLines={1}>
            {slot.teacher}
          </Text>
          <Pill
            label={slot.scope}
            color={Colors.primary}
            backgroundColor={Colors.primarySoft}
            size="sm"
          />
        </View>
        <Text style={styles.subjectLine}>{slot.subject?.trim() || 'No subject'}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={Colors.inkMuted} />
            <Text style={styles.metaText}>{slot.date}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={Colors.inkMuted} />
            <Text style={styles.metaText}>{slot.time}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="videocam-outline" size={13} color={Colors.inkMuted} />
            <Text style={styles.metaText}>{slot.mode}</Text>
          </View>
        </View>
        <View style={styles.openRow}>
          <Text style={styles.openText}>
            {slot.classes.length > 1 ? 'See classes' : 'See sections'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
        </View>
      </TouchableOpacity>
      {slot.meetingLink ? <MeetingLinkButton link={slot.meetingLink} onPress={onOpenLink} /> : null}
      <CancelButton onPress={onCancel} disabled={cancelDisabled} />
    </View>
  </Animated.View>
);

const ClassRow: React.FC<{
  group: PtmClassGroup;
  index: number;
  onPress: () => void;
}> = ({ group, index, onPress }) => (
  <Animated.View entering={FadeInDown.delay(80 + index * 40).springify()}>
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${group.classTitle}`}
    >
      <Text style={styles.studentName}>{group.classTitle}</Text>
      <Text style={styles.subject}>
        {countLabel(group.sections.length, 'section', 'sections')}
        {' · '}
        {countLabel(group.meetingCount, 'student', 'students')}
      </Text>
      <View style={styles.openRow}>
        <Text style={styles.openText}>See sections</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  </Animated.View>
);

const SectionRow: React.FC<{
  section: PtmSectionGroup;
  index: number;
  onPress: () => void;
}> = ({ section, index, onPress }) => (
  <Animated.View entering={FadeInDown.delay(80 + index * 40).springify()}>
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${section.sectionTitle}`}
    >
      <Text style={styles.studentName}>{section.sectionTitle}</Text>
      <Text style={styles.subject}>
        {countLabel(section.meetings.length, 'student', 'students')}
      </Text>
      <View style={styles.openRow}>
        <Text style={styles.openText}>See students</Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  </Animated.View>
);

const StudentRow: React.FC<{ meeting: PtmMeeting; index: number }> = ({ meeting, index }) => (
  <Animated.View entering={FadeInDown.delay(80 + index * 40).springify()}>
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
      {meeting.parentName ? <Text style={styles.subject}>Parent: {meeting.parentName}</Text> : null}
    </View>
  </Animated.View>
);

const MeetingLinkButton: React.FC<{ link: string; onPress: () => void }> = ({ link, onPress }) => (
  <TouchableOpacity
    style={styles.linkBtn}
    onPress={onPress}
    accessibilityRole="link"
    accessibilityLabel="Open meeting link"
  >
    <Ionicons name="videocam" size={16} color={Colors.primary} />
    <Text style={styles.linkText} numberOfLines={1}>
      {link}
    </Text>
  </TouchableOpacity>
);

const CancelButton: React.FC<{ onPress: () => void; disabled: boolean }> = ({
  onPress,
  disabled,
}) => (
  <TouchableOpacity style={styles.cancelBtn} onPress={onPress} disabled={disabled}>
    <Text style={styles.cancelBtnText}>Cancel meeting</Text>
  </TouchableOpacity>
);

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
  subjectLine: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.ink,
    marginBottom: 8,
  },
  subject: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 8,
  },
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  linkText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
    textDecorationLine: 'underline',
  },
  cancelBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.absentSoft,
  },
  cancelBtnText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.absent },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 16,
    zIndex: 1,
  },
  sheetError: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.absent,
    marginTop: 8,
  },
  teacherLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  teacherList: { maxHeight: 140 },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  teacherName: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.ink, flex: 1 },
  sheetTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: 6 },
  sheetHint: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginBottom: 12,
  },
  reasonInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.rule,
    borderRadius: Radii.md,
    padding: 12,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    textAlignVertical: 'top',
  },
  sheetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  sheetSecondary: { paddingVertical: 8, paddingHorizontal: 8 },
  sheetSecondaryText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.inkMuted },
  sheetDanger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.absent,
  },
  sheetDangerDisabled: { opacity: 0.4 },
  sheetDangerText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
});
