import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { DatePickerField } from '../components/ui/DatePickerField';
import { useAuth, useTenantId } from '@/features/auth/AuthProvider';
import { useClasses } from '@/features/classes/hooks';
import { useStudentsByClass } from '@/features/students/hooks';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { useSchoolTeachers } from '@/features/teachers/hooks';
import { classGroupKey, classLabel, gradeLabel } from '@/lib/classLabel';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { todayISO } from '@/lib/date';
import { ptmSchema, PtmSchemaType } from '../validation/schemas';
// The backend/parent app render `mode` verbatim (and the parent app picks its icon with
// `mode.startsWith('Video')`), so these must be the exact human-readable strings sent on
// the wire — not codes mapped to labels.
const MODES = ['In person', 'Video call', 'Phone call'];

function parseHm(value: string): Date {
  const [h, m] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function formatHm(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

type ScheduleFor = 'student' | 'section' | 'class' | 'all';

const SCHEDULE_FOR: { id: ScheduleFor; label: string }[] = [
  { id: 'student', label: 'One student' },
  { id: 'section', label: 'Section' },
  { id: 'class', label: 'Class wise' },
  { id: 'all', label: 'All classes' },
];

type SelectOption = { id: string; label: string };

const SelectField: React.FC<{
  placeholder: string;
  valueLabel: string;
  options: SelectOption[];
  onSelect: (id: string) => void;
  error?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  emptyLabel: string;
  multiple?: boolean;
  selectedIds?: string[];
  onChangeIds?: (ids: string[]) => void;
}> = ({
  placeholder,
  valueLabel,
  options,
  onSelect,
  error,
  disabled,
  searchable,
  emptyLabel,
  multiple,
  selectedIds = [],
  onChangeIds,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shown = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.input,
          styles.select,
          error && styles.inputError,
          disabled && styles.disabled,
        ]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        disabled={disabled}
        accessibilityRole="button"
      >
        <Text style={[styles.timeText, !valueLabel && styles.placeholder]} numberOfLines={1}>
          {valueLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.inkMuted} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTap} onPress={close} />
          <View style={styles.sheet}>
            <View>
              <Text style={styles.sheetTitle}>{placeholder}</Text>
              {searchable ? (
                <TextInput
                  style={[styles.input, styles.searchInput]}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor={Colors.inkSoft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
              ) : null}
              <ScrollView style={styles.optionList} keyboardShouldPersistTaps="handled">
                {shown.length === 0 ? (
                  <Text style={styles.hint}>{query.trim() ? 'No matches.' : emptyLabel}</Text>
                ) : (
                  shown.map((option) => {
                    const checked = multiple && selectedIds.includes(option.id);
                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={styles.option}
                        onPress={() => {
                          if (!multiple) {
                            onSelect(option.id);
                            close();
                            return;
                          }
                          if (option.id === 'all') {
                            onChangeIds?.(selectedIds.includes('all') ? [] : ['all']);
                            return;
                          }
                          const withoutAll = selectedIds.filter((id) => id !== 'all');
                          onChangeIds?.(
                            withoutAll.includes(option.id)
                              ? withoutAll.filter((id) => id !== option.id)
                              : [...withoutAll, option.id]
                          );
                        }}
                      >
                        <Text style={styles.optionText}>{option.label}</Text>
                        {checked ? (
                          <Ionicons name="checkmark" size={18} color={Colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
              {multiple ? (
                <TouchableOpacity style={styles.nextBtn} onPress={close}>
                  <Text style={styles.nextBtnText}>Next</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const TimePickerField: React.FC<{
  value: string;
  onChange: (hm: string) => void;
  error?: boolean;
}> = ({ value, onChange, error }) => {
  const [show, setShow] = useState(false);
  const date = value ? parseHm(value) : new Date();

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.input, error && styles.inputError]}>
        {React.createElement('input', {
          type: 'time',
          value: value || '',
          'aria-label': 'Select time',
          onChange: (event: { target: { value: string } }) => {
            if (event.target.value) onChange(event.target.value.slice(0, 5));
          },
          style: {
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: 15,
            backgroundColor: 'transparent',
            color: value ? Colors.ink : Colors.inkSoft,
            fontFamily: 'inherit',
          },
        })}
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.input, error && styles.inputError]}
        accessibilityRole="button"
      >
        <Text style={[styles.timeText, !value && styles.placeholder]}>
          {value || 'Select time'}
        </Text>
      </TouchableOpacity>
      {show ? (
        <DateTimePicker
          value={date}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
          onChange={(event: DateTimePickerEvent, selected?: Date) => {
            if (Platform.OS !== 'ios') setShow(false);
            if (event.type === 'dismissed') return;
            if (selected) onChange(formatHm(selected));
          }}
        />
      ) : null}
      {Platform.OS === 'ios' && show ? (
        <TouchableOpacity onPress={() => setShow(false)} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export const PtmNewScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const { session } = useAuth();
  const tenantId = useTenantId();
  const repos = useRepositories();
  const isPrincipal = session?.user.role === 'principal';
  const [scheduleFor, setScheduleFor] = useState<ScheduleFor>('student');
  const [gradeKey, setGradeKey] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [pickedTeacherIds, setPickedTeacherIds] = useState<string[]>([]);
  const [allTeachers, setAllTeachers] = useState(false);
  const { data: classes = [] } = useClasses();
  const { data: teachers = [] } = useSchoolTeachers();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PtmSchemaType>({
    resolver: zodResolver(ptmSchema),
    defaultValues: {
      classId: '',
      studentId: '',
      subject: '',
      date: todayISO(),
      time: '',
      mode: 'In person',
    },
  });

  const selectedClassId = watch('classId');
  const selectedStudentId = watch('studentId');
  const mode = watch('mode');
  const { data: students = [] } = useStudentsByClass(selectedClassId);

  const gradeOptions = useMemo(() => {
    const labels = new Map<string, string>();
    for (const cls of classes) {
      const key = classGroupKey(cls);
      if (!labels.has(key)) labels.set(key, gradeLabel(key));
    }
    return [...labels.entries()].map(([id, label]) => ({ id, label }));
  }, [classes]);

  const scopeClasses = useMemo(() => {
    if (scheduleFor === 'all') return classes;
    if (scheduleFor === 'class') return classes.filter((cls) => classGroupKey(cls) === gradeKey);
    return classes.filter((cls) => cls.id === selectedClassId);
  }, [scheduleFor, classes, gradeKey, selectedClassId]);

  const sectionTeacherId =
    scopeClasses.length > 0 &&
    scopeClasses.every(
      (cls) => cls.classTeacherId && cls.classTeacherId === scopeClasses[0].classTeacherId
    )
      ? scopeClasses[0].classTeacherId
      : undefined;
  const sectionTeacher = teachers.find((teacher) => teacher.id === sectionTeacherId);
  const showTeacherDropdown =
    isPrincipal && scopeClasses.length > 0 && scopeClasses.some((cls) => !cls.classTeacherId);

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const selectedStudent = students.find((student) => student.id === selectedStudentId);

  const studentsIn = async (classIds: string[]) => {
    const pages = await Promise.all(
      classIds.map(async (classId) => {
        const rows: { studentId: string; classId: string }[] = [];
        let cursor: string | undefined;
        for (;;) {
          const page = await repos.students.listByClass(classId, { limit: 200, cursor });
          rows.push(...page.items.map((student) => ({ studentId: student.id, classId })));
          if (!page.nextCursor) break;
          cursor = page.nextCursor;
        }
        return rows;
      })
    );
    return pages.flat();
  };

  const onSubmit = (data: PtmSchemaType) => {
    const subject = data.subject?.trim() ?? '';
    const link = meetingLink.trim();
    if (data.date < todayISO()) {
      setErrorToast('Choose today or a later date.');
      return;
    }
    if (data.mode === 'Video call' && !link) {
      setErrorToast('Paste the video meeting link to send.');
      return;
    }
    if (showTeacherDropdown && !allTeachers && pickedTeacherIds.length === 0) {
      setErrorToast('Select a teacher, or choose All teachers.');
      return;
    }

    let classIds: string[] = [];
    if (scheduleFor === 'student') {
      if (!data.classId) {
        setErrorToast('Please select a class / section.');
        return;
      }
      if (!data.studentId) {
        setErrorToast('Please select a student.');
        return;
      }
    } else if (scheduleFor === 'section') {
      if (!data.classId) {
        setErrorToast('Please select a section.');
        return;
      }
      classIds = [data.classId];
    } else if (scheduleFor === 'class') {
      if (!gradeKey) {
        setErrorToast('Please select a class.');
        return;
      }
      classIds = scopeClasses.map((cls) => cls.id);
    } else {
      classIds = classes.map((cls) => cls.id);
    }

    const teacherByClass = new Map(classes.map((cls) => [cls.id, cls.classTeacherId]));
    const oneStudent =
      scheduleFor === 'student' && data.studentId && data.classId
        ? [{ studentId: data.studentId, classId: data.classId }]
        : null;

    const teacherIdForClass = (classId: string): string | undefined => {
      const classTeacher = teacherByClass.get(classId);
      if (classTeacher) return classTeacher;
      if (!allTeachers && pickedTeacherIds[0]) return pickedTeacherIds[0];
      if (!isPrincipal && session?.user.id) return session.user.id;
      if (allTeachers) return teachers[0]?.id;
      return undefined;
    };

    const classesOnThisMeeting = oneStudent ? [oneStudent[0].classId] : classIds;
    if (
      classesOnThisMeeting.length === 0 ||
      classesOnThisMeeting.some((classId) => !teacherIdForClass(classId))
    ) {
      setErrorToast('Select a teacher for this meeting.');
      return;
    }

    navigation.goBack();

    void (async () => {
      try {
        const rows = oneStudent ?? (await studentsIn(classIds));
        await Promise.all(
          rows.map((row) =>
            repos.ptm.create({
              studentId: row.studentId,
              subject: subject || undefined,
              date: data.date,
              time: data.time,
              mode: data.mode,
              meetingLink: data.mode === 'Video call' ? link : undefined,
              teacherId: teacherIdForClass(row.classId),
              teacherIds: allTeachers ? teachers.map((teacher) => teacher.id) : pickedTeacherIds,
              allTeachers,
              notifyTeacher: true,
              notifyCrm: true,
            })
          )
        );
      } catch {
        // The form has already closed. The list refresh below still runs.
      } finally {
        void queryClient.invalidateQueries({ queryKey: queryKeys.ptm(tenantId) });
      }
    })();
  };

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title="Schedule meeting"
            subtitle={
              isPrincipal ? 'Any class in this school' : 'A class or subject assigned to you'
            }
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Schedule for</Text>
          <SelectField
            placeholder="Schedule for"
            valueLabel={SCHEDULE_FOR.find((item) => item.id === scheduleFor)?.label ?? ''}
            options={SCHEDULE_FOR}
            emptyLabel="No choices."
            onSelect={(id) => {
              setScheduleFor(id as ScheduleFor);
              setGradeKey('');
              setValue('classId', '');
              setValue('studentId', '');
              setValue('subject', '');
            }}
          />
          <Text style={styles.hint}>
            {scheduleFor === 'student'
              ? 'Pick one student. Search the student list after you choose a section.'
              : scheduleFor === 'section'
                ? 'Every student in the selected section.'
                : scheduleFor === 'class'
                  ? 'Every section of the selected class.'
                  : isPrincipal
                    ? 'Every class in this school.'
                    : 'Every class assigned to you.'}
          </Text>
        </Animated.View>

        {scheduleFor === 'class' ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Class *</Text>
            <SelectField
              placeholder="Select class"
              valueLabel={gradeOptions.find((item) => item.id === gradeKey)?.label ?? ''}
              options={gradeOptions}
              emptyLabel={
                isPrincipal ? 'This school has no classes yet.' : 'You have no assigned class.'
              }
              onSelect={(id) => {
                setGradeKey(id);
                setValue('subject', '');
              }}
            />
          </Animated.View>
        ) : null}

        {scheduleFor === 'student' || scheduleFor === 'section' ? (
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>
              {scheduleFor === 'section' ? 'Section *' : 'Class / section *'}
            </Text>
            <SelectField
              placeholder={scheduleFor === 'section' ? 'Select section' : 'Select class / section'}
              valueLabel={
                selectedClass ? classLabel(selectedClass.name, selectedClass.section) : ''
              }
              options={classes.map((cls) => ({
                id: cls.id,
                label: classLabel(cls.name, cls.section),
              }))}
              error={!!errors.classId}
              searchable
              emptyLabel={
                isPrincipal
                  ? 'This school has no classes yet.'
                  : 'You have no assigned class or subject.'
              }
              onSelect={(id) => {
                setValue('classId', id);
                setValue('studentId', '');
                setValue('subject', '');
              }}
            />
          </Animated.View>
        ) : null}

        {scheduleFor === 'student' ? (
          <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Student *</Text>
            <SelectField
              placeholder="Select student"
              valueLabel={selectedStudent?.name ?? ''}
              options={students.map((student) => ({ id: student.id, label: student.name }))}
              error={!!errors.studentId}
              disabled={!selectedClassId}
              searchable
              emptyLabel={
                selectedClassId ? 'No students in this class.' : 'Select a section first.'
              }
              onSelect={(id) => setValue('studentId', id)}
            />
          </Animated.View>
        ) : null}

        {sectionTeacher ? (
          <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Section teacher</Text>
            <View style={[styles.input, styles.select]}>
              <Text style={styles.timeText}>{sectionTeacher.name}</Text>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>{showTeacherDropdown ? 'Teachers *' : 'Notify teachers'}</Text>
          <SelectField
            placeholder="Select teachers"
            valueLabel={
              allTeachers
                ? 'All teachers'
                : teachers
                    .filter((teacher) => pickedTeacherIds.includes(teacher.id))
                    .map((teacher) => teacher.name)
                    .join(', ')
            }
            options={[
              { id: 'all', label: 'All teachers' },
              ...teachers.map((teacher) => ({ id: teacher.id, label: teacher.name })),
            ]}
            searchable
            multiple
            selectedIds={allTeachers ? ['all'] : pickedTeacherIds}
            emptyLabel="No teachers found."
            onSelect={() => {}}
            onChangeIds={(ids) => {
              if (ids.includes('all')) {
                setAllTeachers(true);
                setPickedTeacherIds([]);
                return;
              }
              setAllTeachers(false);
              setPickedTeacherIds(ids);
            }}
          />
          {showTeacherDropdown ? null : (
            <Text style={styles.hint}>
              Optional. Choose several teachers, or All teachers, for the app notification and CRM.
            </Text>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>PTM subject</Text>
          <Controller
            control={control}
            name="subject"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="What the meeting is about"
                placeholderTextColor={Colors.inkSoft}
              />
            )}
          />
          <Text style={styles.hint}>Sent to the parent and the section teacher.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(190).springify()} style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date *</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <DatePickerField
                  value={value}
                  onChange={onChange}
                  error={!!errors.date}
                  minimumDate={new Date(new Date().setHours(0, 0, 0, 0))}
                />
              )}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date.message}</Text>}
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Time *</Text>
            <Controller
              control={control}
              name="time"
              render={({ field: { onChange, value } }) => (
                <TimePickerField value={value} onChange={onChange} error={!!errors.time} />
              )}
            />
            {errors.time && <Text style={styles.errorText}>{errors.time.message}</Text>}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Mode *</Text>
          <Controller
            control={control}
            name="mode"
            render={({ field: { onChange, value } }) => (
              <View style={styles.chipGrid}>
                {MODES.map((m) => {
                  const isSelected = value === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => onChange(m)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipActiveText]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errors.mode && <Text style={styles.errorText}>{errors.mode.message}</Text>}
          {mode === 'Video call' ? (
            <View style={styles.linkBox}>
              <Text style={styles.label}>Meeting link *</Text>
              <TextInput
                style={styles.input}
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="Paste the video meeting link"
                placeholderTextColor={Colors.inkSoft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.hint}>This link is sent with the video PTM.</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit(onSubmit)}>
            <Text style={styles.submitBtnText}>Schedule meeting</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Toast
        visible={!!errorToast}
        message={errorToast ?? ''}
        type="error"
        onHide={() => setErrorToast(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 4 },
  fieldGroup: { marginBottom: 16 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink3, marginBottom: 8 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted, marginTop: 8 },
  searchInput: { marginBottom: 10 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disabled: { opacity: 0.6 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdropTap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: 20,
    maxHeight: '70%',
    ...Shadows.pop,
  },
  sheetTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.ink,
    marginBottom: 12,
  },
  optionList: { maxHeight: 280 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
  },
  optionText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.ink, flex: 1 },
  nextBtn: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  nextBtnText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.white },
  linkBox: { marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
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
  inputError: { borderColor: Colors.absent },
  timeText: { fontFamily: FontFamily.regular, fontSize: 15, color: Colors.ink },
  placeholder: { color: Colors.inkSoft },
  done: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  doneText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.primary },
  errorText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.absent, marginTop: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.rule,
    backgroundColor: Colors.card,
  },
  chipText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipActiveText: { color: Colors.white },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.pop,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
});
