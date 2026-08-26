import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { DatePickerField } from '../components/ui/DatePickerField';
import { useClasses } from '../features/classes/hooks';
import {
  useCreateAssignment,
  useUpdateAssignment,
  useAssignments,
} from '../features/assignments/hooks';
import { useTimetable } from '../features/timetable/hooks';
import { deriveColorSet } from '../theme/derive';
import { assignmentSchema, AssignmentSchemaType } from '../validation/schemas';
import { pickImageFromLibrary, takePhotoFromCamera } from '../lib/pickImage';
import { classLabel } from '@/lib/classLabel';
import { homeworkPeriodsForSubject, homeworkSubjectsForClass } from '@/lib/homeworkSubjects';
import { todayISO, weekdayShort } from '@/lib/date';
import { useAuth } from '@/features/auth/AuthProvider';
import type { HomeStackParamList } from '../navigation/types';

type Route = RouteProp<HomeStackParamList, 'AssignmentNewScreen'>;

export const AssignmentNewScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const assignmentId = route.params?.assignmentId;
  const isEdit = Boolean(assignmentId);
  const insets = useSafeAreaInsets();
  const [toastVisible, setToastVisible] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);

  const { data: classes = [] } = useClasses();
  const { data: timetable = [] } = useTimetable();
  const { session } = useAuth();
  const teacherName = session?.user.role === 'principal' ? null : session?.user.name;
  const { data: assignments = [] } = useAssignments();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const existing = assignments.find((a) => a.id === assignmentId);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<AssignmentSchemaType>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      classId: '',
      subject: '',
      period: undefined,
      dueDate: todayISO(),
      description: '',
      imageUri: undefined,
    },
  });

  useEffect(() => {
    if (!existing) return;
    reset({
      title: existing.title,
      classId: existing.classId,
      subject: existing.subject,
      period: existing.period ?? undefined,
      dueDate: existing.dueDate,
      description: existing.description ?? '',
      imageUri: existing.imageUri,
    });
  }, [existing, reset]);

  const selectedClassId = watch('classId');
  const selectedSubject = watch('subject');
  const selectedDueDate = watch('dueDate');
  const imageUri = watch('imageUri');
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const day = selectedDueDate ? weekdayShort(selectedDueDate) : null;

  const subjects = useMemo(
    () =>
      selectedClassId ? homeworkSubjectsForClass(timetable, selectedClassId, teacherName, day) : [],
    [timetable, selectedClassId, teacherName, day]
  );
  const periods = useMemo(
    () =>
      selectedClassId && selectedSubject
        ? homeworkPeriodsForSubject(timetable, selectedClassId, selectedSubject, teacherName, day)
        : [],
    [timetable, selectedClassId, selectedSubject, teacherName, day]
  );

  useEffect(() => {
    if (selectedSubject && !subjects.includes(selectedSubject)) {
      setValue('subject', '');
      setValue('period', undefined);
    }
  }, [subjects, selectedSubject, setValue]);

  useEffect(() => {
    if (periods.length === 1) setValue('period', periods[0]);
  }, [periods, setValue]);

  const handlePick = async (source: 'library' | 'camera') => {
    setPickError(null);
    try {
      const uri = source === 'camera' ? await takePhotoFromCamera() : await pickImageFromLibrary();
      if (uri) setValue('imageUri', uri);
    } catch {
      setPickError('Could not access images. Check permissions and try again.');
    }
  };

  const saving = createAssignment.isPending || updateAssignment.isPending;

  const onSubmit = (data: AssignmentSchemaType) => {
    if (periods.length > 1 && data.period == null) {
      setPeriodError('Please select a period');
      return;
    }
    setPeriodError(null);
    const payload = {
      title: data.title,
      classId: data.classId,
      className: selectedClass ? classLabel(selectedClass.name, selectedClass.section) : undefined,
      subject: data.subject,
      period: data.period ?? (periods.length === 1 ? periods[0] : null),
      dueDate: data.dueDate,
      description: data.description?.trim() ? data.description.trim() : undefined,
      imageUri: data.imageUri,
    };
    const onSuccess = () => {
      setToastVisible(true);
      setTimeout(() => navigation.goBack(), 1500);
    };
    if (isEdit && assignmentId) {
      updateAssignment.mutate({ id: assignmentId, ...payload }, { onSuccess });
    } else {
      createAssignment.mutate(payload, { onSuccess });
    }
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
            title={isEdit ? 'Edit Homework' : 'New Homework'}
            subtitle={isEdit ? 'Update and save' : 'Share with the class'}
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Homework Title *</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Algebra Practice Set"
                placeholderTextColor={Colors.inkSoft}
              />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Class / section *</Text>
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
                    setValue('period', undefined);
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

        {selectedClassId ? (
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Subject *</Text>
            {subjects.length === 0 ? (
              <Text style={styles.hint}>
                {teacherName
                  ? 'No timetable periods assigned to you for this class on this due date.'
                  : 'No timetable subjects for this class on this due date.'}
              </Text>
            ) : (
              <View style={styles.classGrid}>
                {subjects.map((name) => {
                  const isSelected = selectedSubject === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[styles.classChip, isSelected && styles.chipActive]}
                      onPress={() => {
                        setValue('subject', name);
                        setValue('period', undefined);
                        setPeriodError(null);
                      }}
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

        {periods.length > 1 ? (
          <Animated.View entering={FadeInDown.delay(170).springify()} style={styles.fieldGroup}>
            <Text style={styles.label}>Period *</Text>
            <Controller
              control={control}
              name="period"
              render={({ field: { value, onChange } }) => (
                <View style={styles.classGrid}>
                  {periods.map((p) => {
                    const isSelected = value === p;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[styles.classChip, isSelected && styles.chipActive]}
                        onPress={() => {
                          onChange(p);
                          setPeriodError(null);
                        }}
                      >
                        <Text style={[styles.classChipText, isSelected && styles.chipActiveText]}>
                          P{p}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
            {periodError ? <Text style={styles.errorText}>{periodError}</Text> : null}
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Due Date *</Text>
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { onChange, value } }) => (
              <DatePickerField value={value} onChange={onChange} placeholder="Select due date" />
            )}
          />
          {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate.message}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={value}
                onChangeText={onChange}
                placeholder="Instructions for students..."
                placeholderTextColor={Colors.inkSoft}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Attachment</Text>
          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => setValue('imageUri', undefined)}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="close" size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={() => handlePick('library')}>
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
                <Text style={styles.pickBtnText}>Photo Library</Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' && (
                <TouchableOpacity style={styles.pickBtn} onPress={() => handlePick('camera')}>
                  <Ionicons name="camera-outline" size={20} color={Colors.primary} />
                  <Text style={styles.pickBtnText}>Take Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {pickError && <Text style={styles.errorText}>{pickError}</Text>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <TouchableOpacity
            style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
          >
            <Text style={styles.submitBtnText}>
              {saving
                ? isEdit
                  ? 'Saving...'
                  : 'Sharing...'
                : isEdit
                  ? 'Save homework'
                  : 'Create & share'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={isEdit ? 'Homework updated!' : 'Homework shared with the class!'}
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
  textArea: { minHeight: 96 },
  inputError: { borderColor: Colors.absent },
  errorText: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.absent, marginTop: 4 },
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
  pickRow: { flexDirection: 'row', gap: 12 },
  pickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  pickBtnText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.primary },
  previewWrap: { position: 'relative', alignSelf: 'flex-start' },
  preview: {
    width: 160,
    height: 160,
    borderRadius: Radii.md,
    backgroundColor: Colors.paper2,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
