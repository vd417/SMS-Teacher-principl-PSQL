import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { DatePickerField } from '../components/ui/DatePickerField';
import { useClasses } from '../features/classes/hooks';
import { useTimetable } from '../features/timetable/hooks';
import { useCreateExam } from '../features/exams/hooks';
import { deriveColorSet } from '../theme/derive';
import { classLabel } from '@/lib/classLabel';
import { homeworkSubjectsForClass } from '@/lib/homeworkSubjects';
import { todayISO, weekdayShort } from '@/lib/date';
import { useAuth } from '@/features/auth/AuthProvider';
import { examSchema, ExamSchemaType } from '../validation/schemas';

export const ExamNewScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [toastVisible, setToastVisible] = useState(false);
  const [topicInput, setTopicInput] = useState('');

  const { data: classes = [] } = useClasses();
  const { data: timetable = [] } = useTimetable();
  const { session } = useAuth();
  const teacherName = session?.user.role === 'principal' ? null : session?.user.name;
  const createExam = useCreateExam();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ExamSchemaType>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: '',
      classId: '',
      subject: '',
      date: todayISO(),
      time: '',
      duration: 45,
      maxMarks: 20,
      topics: [],
    },
  });

  const topics = watch('topics');
  const selectedClassId = watch('classId');
  const selectedSubject = watch('subject');
  const selectedDate = watch('date');
  const day = selectedDate ? weekdayShort(selectedDate) : null;
  const subjects = useMemo(
    () =>
      selectedClassId ? homeworkSubjectsForClass(timetable, selectedClassId, teacherName, day) : [],
    [timetable, selectedClassId, teacherName, day]
  );

  useEffect(() => {
    if (selectedSubject && !subjects.includes(selectedSubject)) setValue('subject', '');
  }, [subjects, selectedSubject, setValue]);

  const addTopic = () => {
    if (topicInput.trim()) {
      setValue('topics', [...topics, topicInput.trim()]);
      setTopicInput('');
    }
  };

  const removeTopic = (idx: number) => {
    setValue(
      'topics',
      topics.filter((_, i) => i !== idx)
    );
  };

  const onSubmit = (data: ExamSchemaType) => {
    createExam.mutate(
      {
        title: data.title,
        classId: data.classId,
        subject: data.subject,
        date: data.date,
        time: data.time,
        duration: data.duration,
        maxMarks: data.maxMarks,
        topics: data.topics,
        status: 'upcoming',
      },
      {
        onSuccess: () => {
          setToastVisible(true);
          setTimeout(() => navigation.goBack(), 1500);
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
          <ScreenHeader
            title="New class test"
            subtitle="CRM owns exams · this notifies parents of the class"
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Title *</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Unit test 2"
                placeholderTextColor={Colors.inkSoft}
              />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Class *</Text>
          <View style={styles.classGrid}>
            {classes.map((cls) => {
              const { color } = deriveColorSet(cls.id);
              const isSelected = selectedClassId === cls.id;
              return (
                <TouchableOpacity
                  key={cls.id}
                  style={[
                    styles.classChip,
                    isSelected && { backgroundColor: color, borderColor: color },
                  ]}
                  onPress={() => {
                    setValue('classId', cls.id);
                    setValue('subject', '');
                  }}
                >
                  <Text style={[styles.classChipText, isSelected && { color: Colors.white }]}>
                    {classLabel(cls.name, cls.section)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.classId && <Text style={styles.errorText}>{errors.classId.message}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date *</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <DatePickerField
                  value={value}
                  onChange={onChange}
                  placeholder="Select date"
                  error={Boolean(errors.date)}
                />
              )}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date.message}</Text>}
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Start time *</Text>
            <Controller
              control={control}
              name="time"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.time && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="09:00"
                  placeholderTextColor={Colors.inkSoft}
                />
              )}
            />
            {errors.time && <Text style={styles.errorText}>{errors.time.message}</Text>}
          </View>
        </Animated.View>

        {selectedClassId ? (
          <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Subject *</Text>
            {subjects.length === 0 ? (
              <Text style={styles.hint}>
                {teacherName
                  ? 'No timetable periods assigned to you for this class on this date.'
                  : 'No timetable subjects for this class on this date.'}
              </Text>
            ) : (
              <View style={styles.classGrid}>
                {subjects.map((name) => {
                  const isSelected = selectedSubject === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.classChip, isSelected && styles.chipActive]}
                      onPress={() => setValue('subject', name)}
                    >
                      <Text style={[styles.classChipText, isSelected && styles.chipActiveText]}>
                        {name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {errors.subject && <Text style={styles.errorText}>{errors.subject.message}</Text>}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Duration (min) *</Text>
            <Controller
              control={control}
              name="duration"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.duration && styles.inputError]}
                  value={String(value)}
                  onChangeText={(t) => onChange(Number(t) || 0)}
                  keyboardType="numeric"
                  placeholder="45"
                  placeholderTextColor={Colors.inkSoft}
                />
              )}
            />
            {errors.duration && <Text style={styles.errorText}>{errors.duration.message}</Text>}
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Max marks *</Text>
            <Controller
              control={control}
              name="maxMarks"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.maxMarks && styles.inputError]}
                  value={String(value)}
                  onChangeText={(t) => onChange(Number(t) || 0)}
                  keyboardType="numeric"
                  placeholder="20"
                  placeholderTextColor={Colors.inkSoft}
                />
              )}
            />
            {errors.maxMarks && <Text style={styles.errorText}>{errors.maxMarks.message}</Text>}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Topics</Text>
          <View style={styles.topicInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={topicInput}
              onChangeText={setTopicInput}
              placeholder="Add a topic..."
              placeholderTextColor={Colors.inkSoft}
              onSubmitEditing={addTopic}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addTopicBtn} onPress={addTopic}>
              <Ionicons name="add" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          {topics.length > 0 && (
            <View style={styles.topicsWrap}>
              {topics.map((topic, i) => (
                <TouchableOpacity key={i} style={styles.topicChip} onPress={() => removeTopic(i)}>
                  <Text style={styles.topicText}>{topic}</Text>
                  <Ionicons name="close" size={12} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.fieldGroup}>
          <Text style={styles.notifyNote}>
            Creating this test notifies every parent of the selected class in the parent app.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(340).springify()}>
          <TouchableOpacity
            style={[styles.submitBtn, createExam.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={createExam.isPending}
          >
            <Text style={styles.submitBtnText}>
              {createExam.isPending ? 'Creating…' : 'Create & notify parents'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message="Class test created. Parents notified."
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
  notifyNote: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    lineHeight: 18,
  },
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
  errorText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.absent, marginTop: 4 },
  row: { flexDirection: 'row', gap: 12 },
  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  classChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.rule,
    backgroundColor: Colors.card,
  },
  classChipText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipActiveText: { color: Colors.white },
  topicInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addTopicBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  topicText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
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
