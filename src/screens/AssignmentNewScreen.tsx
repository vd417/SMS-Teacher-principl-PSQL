import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Toast } from '../components';
import { useClasses } from '../features/classes/hooks';
import { useCreateAssignment } from '../features/assignments/hooks';
import { deriveColorSet } from '../theme/derive';
import { assignmentSchema, AssignmentSchemaType } from '../validation/schemas';
import { pickImageFromLibrary, takePhotoFromCamera } from '../lib/pickImage';

export const AssignmentNewScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [toastVisible, setToastVisible] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  const { data: classes = [] } = useClasses();
  const createAssignment = useCreateAssignment();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AssignmentSchemaType>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      classId: '',
      dueDate: '2026-06-20',
      description: '',
      imageUri: undefined,
    },
  });

  const selectedClassId = watch('classId');
  const imageUri = watch('imageUri');

  const handlePick = async (source: 'library' | 'camera') => {
    setPickError(null);
    try {
      const uri = source === 'camera' ? await takePhotoFromCamera() : await pickImageFromLibrary();
      if (uri) setValue('imageUri', uri);
    } catch {
      setPickError('Could not access images. Check permissions and try again.');
    }
  };

  const onSubmit = (data: AssignmentSchemaType) => {
    createAssignment.mutate(
      {
        title: data.title,
        classId: data.classId,
        dueDate: data.dueDate,
        description: data.description?.trim() ? data.description.trim() : undefined,
        imageUri: data.imageUri,
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
          <ScreenHeader title="New Homework" subtitle="Fill in the details" showBack />
        </Animated.View>

        {/* Title */}
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

        {/* Class */}
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
                  onPress={() => setValue('classId', cls.id)}
                >
                  <Text style={[styles.classChipText, isSelected && { color: Colors.white }]}>
                    {cls.name}-{cls.section}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.classId && <Text style={styles.errorText}>{errors.classId.message}</Text>}
        </Animated.View>

        {/* Due date */}
        <Animated.View entering={FadeInDown.delay(180).springify()} style={styles.fieldGroup}>
          <Text style={styles.label}>Due Date *</Text>
          <Controller
            control={control}
            name="dueDate"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.input, errors.dueDate && styles.inputError]}
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.inkSoft}
              />
            )}
          />
          {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate.message}</Text>}
        </Animated.View>

        {/* Description */}
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

        {/* Image */}
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

        {/* Submit */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <TouchableOpacity
            style={[styles.submitBtn, createAssignment.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={createAssignment.isPending}
          >
            <Text style={styles.submitBtnText}>
              {createAssignment.isPending ? 'Creating...' : 'Create Homework'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message="Homework created successfully!"
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
