import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { DatePickerField } from '../components/ui/DatePickerField';
import { useClasses } from '@/features/classes/hooks';
import { useStudentsByClass } from '@/features/students/hooks';
import { useCreatePtm } from '@/features/ptm/hooks';
import { deriveColorSet } from '../theme/derive';
import { classLabel } from '@/lib/classLabel';
import { todayISO } from '@/lib/date';
import { ptmSchema, PtmSchemaType } from '../validation/schemas';

const MODES: { value: string; label: string }[] = [
  { value: 'in_person', label: 'In person' },
  { value: 'video_call', label: 'Video call' },
  { value: 'phone_call', label: 'Phone call' },
];

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

const TimePickerField: React.FC<{
  value: string;
  onChange: (hm: string) => void;
  error?: boolean;
}> = ({ value, onChange, error }) => {
  const [show, setShow] = useState(false);
  const date = value ? parseHm(value) : new Date();

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
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_e: DateTimePickerEvent, selected?: Date) => {
            if (Platform.OS === 'android') setShow(false);
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
  const [toastVisible, setToastVisible] = useState(false);

  const { data: classes = [] } = useClasses();
  const createPtm = useCreatePtm();

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
      mode: 'in_person',
    },
  });

  const selectedClassId = watch('classId');
  const selectedStudentId = watch('studentId');
  const { data: students = [] } = useStudentsByClass(selectedClassId);

  const onSubmit = (data: PtmSchemaType) => {
    createPtm.mutate(
      {
        studentId: data.studentId,
        subject: data.subject?.trim() ? data.subject.trim() : undefined,
        date: data.date,
        time: data.time,
        mode: data.mode,
      },
      {
        onSuccess: () => {
          setToastVisible(true);
          setTimeout(() => navigation.goBack(), 1200);
        },
      }
    );
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
          <ScreenHeader title="New Meeting" subtitle="Schedule a parent-teacher meeting" showBack />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Class / section *</Text>
          <View style={styles.chipGrid}>
            {classes.map((cls) => {
              const { color } = deriveColorSet(cls.id);
              const isSelected = selectedClassId === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.chip,
                    isSelected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => {
                    setValue('classId', cls.id);
                    setValue('studentId', '');
                  }}
                >
                  <Text style={[styles.chipText, isSelected && { color: Colors.white }]}>
                    {classLabel(cls.name, cls.section)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.classId && <Text style={styles.errorText}>{errors.classId.message}</Text>}
        </Animated.View>

        {selectedClassId ? (
          <Animated.View entering={FadeInDown.delay(130).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Student *</Text>
            {students.length === 0 ? (
              <Text style={styles.hint}>No students in this class.</Text>
            ) : (
              <View style={styles.chipGrid}>
                {students.map((s) => {
                  const isSelected = selectedStudentId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setValue('studentId', s.id)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipActiveText]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {errors.studentId && <Text style={styles.errorText}>{errors.studentId.message}</Text>}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Subject</Text>
          <Controller
            control={control}
            name="subject"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Mathematics"
                placeholderTextColor={Colors.inkSoft}
              />
            )}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(190).springify()} style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date *</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <DatePickerField value={value} onChange={onChange} error={!!errors.date} />
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
                  const isSelected = value === m.value;
                  return (
                    <TouchableOpacity
                      key={m.value}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => onChange(m.value)}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipActiveText]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />
          {errors.mode && <Text style={styles.errorText}>{errors.mode.message}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()}>
          <TouchableOpacity
            style={[styles.submitBtn, createPtm.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={createPtm.isPending}
          >
            <Text style={styles.submitBtnText}>
              {createPtm.isPending ? 'Scheduling...' : 'Schedule meeting'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message="Meeting scheduled!"
        type="success"
        onHide={() => setToastVisible(false)}
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
  hint: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
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
