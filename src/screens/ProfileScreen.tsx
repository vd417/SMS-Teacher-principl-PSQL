import React, { useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Card } from '../components';
import { useFeature } from '@/features/plan/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { useLogout, useUpdatePhoto } from '@/features/auth/hooks';
import { useDashboardStats } from '@/features/dashboard/hooks';
import { useMySchools } from '@/features/auth/useMySchools';
import { pickImageFromLibrary, takePhotoFromCamera } from '@/lib/pickImage';
import { dialPhoneNumber } from '@/lib/phoneLink';
import { authErrorMessage } from '@/features/auth/authErrors';
import type { ProfileStackParamList } from '../navigation/types';

type ProfileNav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileScreen'>;

const NOT_ASSIGNED = 'Not assigned';

function contactDisplay(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed || NOT_ASSIGNED;
}

const MENU_ITEMS = [
  {
    icon: 'time-outline',
    label: 'My Attendance',
    screen: 'MyAttendanceScreen',
    color: Colors.primary,
  },
  {
    icon: 'document-text-outline',
    label: 'My Payslip',
    screen: 'PayslipScreen',
    feature: 'hr_payroll',
    color: Colors.present,
  },
  {
    icon: 'calendar-outline',
    label: 'Leave Requests',
    screen: 'LeaveScreen',
    feature: 'operations',
    color: Colors.coral,
  },
  {
    icon: 'key-outline',
    label: 'Change Password',
    screen: 'ChangePasswordScreen',
    color: Colors.blue,
  },
  { icon: 'settings-outline', label: 'Settings', screen: 'SettingsScreen', color: Colors.blue },
  {
    icon: 'shield-checkmark-outline',
    label: 'Privacy & Security',
    screen: 'SettingsScreen',
    color: Colors.teal,
  },
  {
    icon: 'help-circle-outline',
    label: 'Help & Support',
    screen: 'SettingsScreen',
    color: Colors.late,
  },
] as const;

type ProfileMenuItem = (typeof MENU_ITEMS)[number] & { feature?: string };

function ProfileMenuRow({
  item,
  isLast,
  onPress,
}: {
  item: ProfileMenuItem;
  isLast: boolean;
  onPress: () => void;
}) {
  // useFeature must run unconditionally (rules-of-hooks) — an unrecognized feature
  // key defaults to the lowest tier requirement, which every plan satisfies, so this
  // is equivalent to "always allowed" for rows with no feature restriction.
  const { allowed } = useFeature(item.feature ?? 'none');

  return (
    <TouchableOpacity
      style={[styles.menuRow, !isLast && styles.menuRowBorder, !allowed && styles.menuRowLocked]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconWrap, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as never} size={20} color={item.color} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      {!allowed ? (
        <Ionicons name="lock-closed" size={16} color={Colors.inkMuted} />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
      )}
    </TouchableOpacity>
  );
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNav>();
  const insets = useSafeAreaInsets();
  const { session, refreshProfile } = useAuth();
  const user = session?.user;
  const tenantName = session?.tenant.name ?? 'School';

  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => {
        /* keep showing the last-known profile if the refresh fails */
      });
    }, [refreshProfile])
  );

  const { data: stats } = useDashboardStats();
  const updatePhoto = useUpdatePhoto();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePickPhoto = async (source: 'library' | 'camera') => {
    setPhotoError(null);
    try {
      const uri = source === 'camera' ? await takePhotoFromCamera() : await pickImageFromLibrary();
      if (!uri) return;
      await updatePhoto.mutateAsync(uri);
      setPickerOpen(false);
    } catch (err) {
      setPhotoError(authErrorMessage(err, 'Could not update your photo. Try again.'));
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    try {
      await updatePhoto.mutateAsync(null);
      setPickerOpen(false);
    } catch (err) {
      setPhotoError(authErrorMessage(err, 'Could not remove your photo. Try again.'));
    }
  };
  const { data: mySchools } = useMySchools();
  const menuItems =
    (mySchools?.length ?? 0) > 1
      ? [
          ...MENU_ITEMS,
          {
            icon: 'business-outline',
            label: 'Switch School',
            screen: 'SwitchSchool',
            color: Colors.primary,
          },
        ]
      : MENU_ITEMS;
  const logout = useLogout();

  const handleMenuPress = (screen: string | null) => {
    if (!screen) return;
    navigation.navigate(screen as keyof ProfileStackParamList);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.heroContent}>
          <TouchableOpacity
            onPress={() => setPickerOpen((open) => !open)}
            activeOpacity={0.8}
            testID="profile-avatar-button"
          >
            <View>
              <Avatar
                initials={user?.initials ?? '?'}
                photoUri={user?.photoUrl}
                size={80}
                backgroundColor="rgba(255,255,255,0.2)"
              />
              <View style={styles.avatarEditBadge}>
                {updatePhoto.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="camera" size={14} color={Colors.white} />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.heroName}>{user?.name ?? ''}</Text>
          <Text style={styles.heroTitle}>{user?.title ?? ''}</Text>
          <Text style={styles.heroSchool}>{tenantName}</Text>

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
              {user?.photoUrl && (
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
        </Animated.View>

        {/* Stats row */}
        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.heroStats}>
          {[
            { label: 'Classes', value: String(stats?.totalClasses ?? '–') },
            { label: 'Students', value: String(stats?.totalStudents ?? '–') },
            { label: 'Since', value: user?.joined ?? '–' },
          ].map((s, i) => (
            <View key={s.label} style={[styles.heroStat, i < 2 && styles.heroStatBorder]}>
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLbl}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>
      </LinearGradient>

      {/* Info Card */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.infoSection}>
        <Text style={styles.sectionTitle}>Contact Info</Text>
        <Card style={styles.infoCard}>
          {[
            { icon: 'mail-outline', label: 'Email', value: user?.email ?? '' },
            { icon: 'call-outline', label: 'Phone', value: user?.phone ?? '', dial: true },
            { icon: 'location-outline', label: 'Classroom', value: user?.classroom ?? '' },
            { icon: 'card-outline', label: 'Employee ID', value: user?.employee ?? '' },
          ].map((item) => {
            const row = (
              <>
                <View style={styles.infoIconWrap}>
                  <Ionicons name={item.icon as never} size={18} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      item.dial && item.value ? styles.infoValueLink : null,
                    ]}
                  >
                    {contactDisplay(item.value)}
                  </Text>
                </View>
              </>
            );
            return item.dial && item.value ? (
              <TouchableOpacity
                key={item.label}
                style={styles.infoRow}
                onPress={() => void dialPhoneNumber(item.value)}
              >
                {row}
              </TouchableOpacity>
            ) : (
              <View key={item.label} style={styles.infoRow}>
                {row}
              </View>
            );
          })}
        </Card>
      </Animated.View>

      {/* Menu */}
      <Animated.View entering={FadeInDown.delay(280).springify()} style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Quick Links</Text>
        <Card padding={0} style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <ProfileMenuRow
              key={item.label}
              item={item}
              isLast={i >= menuItems.length - 1}
              onPress={() => handleMenuPress(item.screen)}
            />
          ))}
        </Card>
      </Animated.View>

      {/* Log Out */}
      <Animated.View entering={FadeInDown.delay(340).springify()} style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => logout.mutate()}
          disabled={logout.isPending}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.absent} />
          <Text style={styles.logoutLabel}>{logout.isPending ? 'Signing Out…' : 'Log Out'}</Text>
        </TouchableOpacity>
      </Animated.View>
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
    paddingBottom: 28,
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
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
    marginTop: 14,
  },
  heroTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroSchool: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 3,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radii.lg,
    paddingVertical: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  heroStatVal: {
    fontFamily: FontFamily.extraBold,
    fontSize: 18,
    color: Colors.white,
  },
  heroStatLbl: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 3,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 12,
  },
  infoCard: {
    padding: 0,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
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
    marginTop: 2,
  },
  infoValueLink: {
    color: Colors.primary,
  },
  menuSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  menuRowLocked: { opacity: 0.72 },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
  },
  logoutSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.lg,
    paddingVertical: 16,
  },
  logoutLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.absent,
  },
});
