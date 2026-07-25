import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMySchools } from '@/features/auth/useMySchools';
import { useSwitchSchool } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';

export const SchoolPickerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { pendingSchools, session, signOut } = useAuth();
  const {
    data: fetchedSchools,
    isLoading: schoolsLoading,
    isError: schoolsErrored,
  } = useMySchools();
  const { mutateAsync: switchSchool, isPending, variables: pickingId, error } = useSwitchSchool();

  // pendingSchools comes pre-loaded from the login-gate sign-in flow; the
  // Profile entry point has none and relies on useMySchools() instead.
  const isLoginGate = pendingSchools !== null;
  const schools = pendingSchools ?? fetchedSchools ?? [];
  const canGoBack = navigation.canGoBack();
  const currentTenantId = session?.tenant.id ?? null;

  const handlePick = async (tenantId: string) => {
    try {
      await switchSchool(tenantId);
      // Login-gate mount has no back stack (RootNavigator swaps the whole
      // stack once status flips to 'authenticated'). The Profile entry point
      // does have one, and nothing else remounts it away automatically.
      if (navigation.canGoBack()) navigation.goBack();
    } catch {
      // Surfaced below via the mutation's `error`; stay on the picker so the
      // user can retry.
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <View
        style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.topBar}>
          {canGoBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.topBarBtn}
              testID="school-picker-back"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarBtn} />
          )}
          {isLoginGate && (
            <TouchableOpacity
              onPress={() => signOut()}
              style={styles.signOutBtn}
              testID="school-picker-sign-out"
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Choose a school</Text>
          <Text style={styles.subtitle}>Your account is linked to more than one school</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
          {!isLoginGate && schoolsLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : !isLoginGate && schoolsErrored ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>Couldn&apos;t load your schools.</Text>
            </View>
          ) : schools.length === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.centerStateText}>No schools found.</Text>
            </View>
          ) : (
            schools.map((school, i) => {
              const isPicking = isPending && pickingId === school.id;
              const isCurrent = school.id === currentTenantId;
              const disabled = isPending;
              return (
                <TouchableOpacity
                  key={school.id}
                  style={[styles.row, i < schools.length - 1 && styles.rowBorder]}
                  onPress={() => handlePick(school.id)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowIconWrap}>
                    <Ionicons name="school-outline" size={20} color={Colors.primary} />
                  </View>
                  <Text style={styles.rowLabel}>{school.name}</Text>
                  {isCurrent && <Text style={styles.currentBadge}>Current</Text>}
                  {isPicking ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>

        {error && <Text style={styles.errorText}>{authErrorMessage(error)}</Text>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topBarBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  signOutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  header: { alignItems: 'center', marginBottom: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Shadows.pop,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.white,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    overflow: 'hidden',
    ...Shadows.pop,
  },
  centerState: { paddingVertical: 28, alignItems: 'center', justifyContent: 'center' },
  centerStateText: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.inkMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
  },
  currentBadge: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.primary,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.coral,
    marginTop: 16,
    textAlign: 'center',
  },
});
