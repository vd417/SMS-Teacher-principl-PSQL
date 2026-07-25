import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Card, Donut, Pill } from '../components';
import { useStudent, useUpdateStudentPhoto } from '@/features/students/hooks';
import { useClass } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { pickImageFromLibrary, takePhotoFromCamera } from '@/lib/pickImage';
import type { HomeStackParamList } from '../navigation/types';

type StudentRoute = RouteProp<HomeStackParamList, 'StudentScreen'>;

export const StudentScreen: React.FC = () => {
  const route = useRoute<StudentRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { studentId } = route.params;

  const {
    data: student,
    isLoading: studentLoading,
    isError: studentError,
    refetch: refetchStudent,
  } = useStudent(studentId);
  const updatePhoto = useUpdateStudentPhoto(studentId);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePickPhoto = async (source: 'library' | 'camera') => {
    setPhotoError(null);
    try {
      const uri = source === 'camera' ? await takePhotoFromCamera() : await pickImageFromLibrary();
      if (!uri) return;
      await updatePhoto.mutateAsync(uri);
      setPickerOpen(false);
    } catch {
      setPhotoError('Could not update the photo. Check permissions and try again.');
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    try {
      await updatePhoto.mutateAsync(null);
      setPickerOpen(false);
    } catch {
      setPhotoError('Could not remove the photo. Try again.');
    }
  };
  const {
    data: cls,
    isLoading: clsLoading,
    isError: clsError,
    refetch: refetchCls,
  } = useClass(student?.classId ?? '');

  const isLoading = studentLoading || clsLoading;
  const isError = studentError || clsError;

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 16, paddingHorizontal: 20 }]}>
        <Skeleton height={200} />
        <Skeleton height={100} />
        <Skeleton height={160} />
      </View>
    );
  }

  if (isError || !student || !cls) {
    return (
      <ErrorState
        message="Could not load student data."
        onRetry={() => {
          void refetchStudent();
          void refetchCls();
        }}
      />
    );
  }

  const cs = deriveColorSet(cls.id);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[cs.color, cs.colorSoft]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setPickerOpen((open) => !open)}
          activeOpacity={0.8}
          testID="student-avatar-button"
        >
          <View>
            <Avatar
              initials={student.initials}
              photoUri={student.photoUrl}
              size={72}
              backgroundColor="rgba(255,255,255,0.25)"
            />
            <View style={styles.avatarEditBadge}>
              {updatePhoto.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Ionicons name="camera" size={13} color={Colors.white} />
              )}
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.heroName}>{student.name}</Text>
        <Text style={styles.heroRole}>
          {cls.name}-{cls.section} · Roll #{student.roll}
        </Text>
        <Pill
          label={`Grade: ${student.grade}`}
          color={cs.color}
          backgroundColor="rgba(255,255,255,0.9)"
          style={styles.gradePill}
        />

        {pickerOpen && (
          <View style={styles.photoPickerRow}>
            <TouchableOpacity
              style={styles.photoPickerBtn}
              onPress={() => handlePickPhoto('library')}
              disabled={updatePhoto.isPending}
            >
              <Ionicons name="images-outline" size={16} color={Colors.white} />
              <Text style={styles.photoPickerBtnText}>Library</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoPickerBtn}
              onPress={() => handlePickPhoto('camera')}
              disabled={updatePhoto.isPending}
            >
              <Ionicons name="camera-outline" size={16} color={Colors.white} />
              <Text style={styles.photoPickerBtnText}>Camera</Text>
            </TouchableOpacity>
            {student.photoUrl && (
              <TouchableOpacity
                style={styles.photoPickerBtn}
                onPress={handleRemovePhoto}
                disabled={updatePhoto.isPending}
              >
                <Ionicons name="trash-outline" size={16} color={Colors.white} />
                <Text style={styles.photoPickerBtnText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {photoError && <Text style={styles.photoErrorText}>{photoError}</Text>}
      </LinearGradient>

      <View style={styles.body}>
        {/* Attendance Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card style={styles.attCard}>
            <View style={styles.attCardContent}>
              <View>
                <Text style={styles.cardTitle}>Attendance</Text>
                <Text style={styles.attPct}>{student.attendance}%</Text>
                <Text style={styles.attDesc}>
                  {student.attendance >= 90
                    ? 'Excellent'
                    : student.attendance >= 75
                      ? 'Average'
                      : 'Poor'}
                </Text>
              </View>
              <Donut
                percentage={student.attendance}
                size={90}
                strokeWidth={9}
                color={
                  student.attendance >= 90
                    ? Colors.present
                    : student.attendance >= 75
                      ? Colors.late
                      : Colors.absent
                }
                backgroundColor={Colors.ruleSoft}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Contact */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={styles.sectionTitle}>Parent / Guardian</Text>
          <Card padding={0}>
            {[
              { icon: 'person-outline', label: 'Name', value: student.parent },
              { icon: 'call-outline', label: 'Phone', value: student.parentPhone },
            ].map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as never} size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Academic Info */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={styles.sectionTitle}>Academic Info</Text>
          <Card padding={0}>
            {[
              { icon: 'school-outline', label: 'Class', value: `${cls.name}-${cls.section}` },
              { icon: 'book-outline', label: 'Subject', value: cls.subject },
              { icon: 'ribbon-outline', label: 'Current Grade', value: student.grade },
              { icon: 'stats-chart-outline', label: 'Attendance', value: `${student.attendance}%` },
            ].map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as never} size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {},
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  photoPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  photoPickerBtnText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.white,
  },
  photoErrorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.coral,
    marginTop: 8,
    textAlign: 'center',
  },
  heroName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.white,
    marginTop: 12,
  },
  heroRole: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    marginBottom: 12,
  },
  gradePill: {
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  attCard: {},
  attCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 6,
  },
  attPct: {
    fontFamily: FontFamily.extraBold,
    fontSize: 36,
    color: Colors.ink,
  },
  attDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  infoValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.ink,
    marginTop: 1,
  },
});
