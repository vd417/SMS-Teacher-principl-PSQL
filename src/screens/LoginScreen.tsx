import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useRequestOtp, useVerifyOtp } from '@/features/auth/hooks';

type Role = 'teacher' | 'principal';

const ROLES: { key: Role; label: string; icon: keyof typeof Ionicons.glyphMap; email: string }[] = [
  { key: 'teacher', label: 'Teacher', icon: 'easel-outline', email: 'aanya.k@westbrook.edu' },
  { key: 'principal', label: 'Principal', icon: 'ribbon-outline', email: 'sunita.r@westbrook.edu' },
];

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const [role, setRole] = useState<Role>('teacher');
  const [otpIdentifier, setOtpIdentifier] = useState(ROLES[0].email);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');

  const requestErr = requestOtp.error instanceof Error ? requestOtp.error.message : null;
  const verifyErr = verifyOtp.error instanceof Error ? verifyOtp.error.message : null;

  const handleSendOtp = () => {
    verifyOtp.reset();
    setOtpCode('');
    requestOtp.mutate(otpIdentifier, {
      onSuccess: (challenge) => {
        setOtpDestination(challenge.destination);
        setOtpSent(true);
      },
    });
  };

  const handleVerifyOtp = () => {
    verifyOtp.mutate({ identifier: otpIdentifier, code: otpCode });
  };

  const handleChangeIdentifier = () => {
    setOtpSent(false);
    setOtpCode('');
    setOtpDestination('');
    verifyOtp.reset();
    requestOtp.reset();
  };

  const handleSelectRole = (next: Role) => {
    setRole(next);
    const account = ROLES.find((r) => r.key === next);
    setOtpIdentifier(account ? account.email : '');
    requestOtp.reset();
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>School Desk</Text>
            <Text style={styles.appTagline}>School Management System</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back 👋</Text>
            <Text style={styles.cardSubtitle}>
              {otpSent
                ? 'Enter the code we sent you'
                : 'Sign in with a one-time code to your mobile or email'}
            </Text>

            {!otpSent ? (
              <View>
                {/* Role selector */}
                <View style={styles.roleRow}>
                  {ROLES.map((r) => {
                    const active = role === r.key;
                    return (
                      <TouchableOpacity
                        key={r.key}
                        style={[styles.roleChip, active && styles.roleChipActive]}
                        activeOpacity={0.85}
                        onPress={() => handleSelectRole(r.key)}
                      >
                        <Ionicons
                          name={r.icon}
                          size={16}
                          color={active ? Colors.white : Colors.primary}
                        />
                        <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Identifier */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number or Email</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={otpIdentifier}
                      onChangeText={setOtpIdentifier}
                      placeholder="Mobile number or email"
                      placeholderTextColor={Colors.inkSoft}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {requestErr && <Text style={styles.errorText}>{requestErr}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.signInBtn, requestOtp.isPending && styles.signInBtnLoading]}
                  activeOpacity={0.9}
                  disabled={requestOtp.isPending}
                  onPress={handleSendOtp}
                >
                  {requestOtp.isPending ? (
                    <Text style={styles.signInBtnText}>Sending…</Text>
                  ) : (
                    <>
                      <Text style={styles.signInBtnText}>Send OTP</Text>
                      <Ionicons name="paper-plane-outline" size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {/* Code */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Verification Code</Text>
                  <Text style={styles.otpSentText}>Code sent to {otpDestination}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="keypad-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor={Colors.inkSoft}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                  {verifyErr && <Text style={styles.errorText}>{verifyErr}</Text>}
                </View>

                <TouchableOpacity
                  style={[styles.signInBtn, verifyOtp.isPending && styles.signInBtnLoading]}
                  activeOpacity={0.9}
                  disabled={verifyOtp.isPending}
                  onPress={handleVerifyOtp}
                >
                  {verifyOtp.isPending ? (
                    <Text style={styles.signInBtnText}>Verifying…</Text>
                  ) : (
                    <>
                      <Text style={styles.signInBtnText}>Verify & Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.otpLinksRow}>
                  <TouchableOpacity onPress={handleSendOtp} disabled={requestOtp.isPending}>
                    <Text style={styles.forgotText}>Resend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleChangeIdentifier}>
                    <Text style={styles.forgotText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Footer */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
            <Text style={styles.footerText}>Westbrook Academy · v1.0.0</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Shadows.pop,
  },
  appName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 30,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  appTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: 28,
    ...Shadows.pop,
  },
  cardTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.ink,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 24,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  roleChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  roleChipTextActive: {
    color: Colors.white,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.ink3,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
  },
  forgotText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.card,
  },
  signInBtnLoading: {
    opacity: 0.8,
  },
  signInBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  otpSentText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.ink3,
    marginBottom: 4,
  },
  otpHintText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginBottom: 12,
  },
  otpLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.coral,
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
});
