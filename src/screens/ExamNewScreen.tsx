import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { classes } from '../data';
import { examSchema, ExamSchemaType } from '../validation/schemas';

export const ExamNewScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [toastVisible, setToastVisible] = useState(false);
  const [topicInput, setTopicInput] = useState('');

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
      date: '2026-05-20',
      time: '9:00 AM',
      duration: 90,
      maxMarks: 100,
      topics: [],
      notifyStudents: true,
      notifyParents: false,
      addToCalendar: true,
    },
  });

  const topics = watch('topics');
  const selectedClassId = watch('classId');

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
    console.log('Exam data:', data);
    setToastVisible(true);
    setTimeout(() => navigation.goBack(), 1500);
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
          <ScreenHeader title="New Exam" subtitle="Fill in the details" showBack />
        </Animated.View>

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Exam Title *</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="e.g. Mid-Term Mathematics"
                placeholderTextColor={Colors.inkSoft}
              />
            )}
          />
          {errors.title && <Text style={styles.errorText}>{errors.title.message}</Text>}
        </Animated.View>

        {/* Class */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Class *</Text>
          <View style={styles.classGrid}>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[
                  styles.classChip,
                  selectedClassId === cls.id && {
                    backgroundColor: cls.color,
                    borderColor: cls.color,
                  },
                ]}
                onPress={() => setValue('classId', cls.id)}
              >
                <Text
                  style={[
                    styles.classChipText,
                    selectedClassId === cls.id && { color: Colors.white },
                  ]}
                >
                  {cls.name}-{cls.section}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.classId && <Text style={styles.errorText}>{errors.classId.message}</Text>}
        </Animated.View>

        {/* Date & Time */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Date *</Text>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.date && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.inkSoft}
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
                <TextInput
                  style={[styles.input, errors.time && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. 9:00 AM"
                  placeholderTextColor={Colors.inkSoft}
                />
              )}
            />
            {errors.time && <Text style={styles.errorText}>{errors.time.message}</Text>}
          </View>
        </Animated.View>

        {/* Duration & Marks */}
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
                  placeholder="90"
                  placeholderTextColor={Colors.inkSoft}
                />
              )}
            />
            {errors.duration && <Text style={styles.errorText}>{errors.duration.message}</Text>}
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Max Marks *</Text>
            <Controller
              control={control}
              name="maxMarks"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[styles.input, errors.maxMarks && styles.inputError]}
                  value={String(value)}
                  onChangeText={(t) => onChange(Number(t) || 0)}
                  keyboardType="numeric"
                  placeholder="100"
                  placeholderTextColor={Colors.inkSoft}
                />
              )}
            />
            {errors.maxMarks && <Text style={styles.errorText}>{errors.maxMarks.message}</Text>}
          </View>
        </Animated.View>

        {/* Topics */}
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

        {/* Toggles */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Notifications</Text>
          {[
            { name: 'notifyStudents' as const, label: 'Notify Students' },
            { name: 'notifyParents' as const, label: 'Notify Parents' },
            { name: 'addToCalendar' as const, label: 'Add to Calendar' },
          ].map((toggle) => (
            <Controller
              key={toggle.name}
              control={control}
              name={toggle.name}
              render={({ field: { onChange, value } }) => (
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>{toggle.label}</Text>
                  <Switch
                    value={value as boolean}
                    onValueChange={onChange}
                    trackColor={{ true: Colors.primary, false: Colors.rule }}
                    thumbColor={Colors.white}
                  />
                </View>
              )}
            />
          ))}
        </Animated.View>

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(340).springify()}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit(onSubmit)}>
            <Text style={styles.submitBtnText}>Create Exam</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message="Exam created successfully!"
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  toggleLabel: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.ink },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.pop,
  },
  submitBtnText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
});
