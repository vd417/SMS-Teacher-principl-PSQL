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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useLogin, useRequestOtp, useVerifyOtp } from '@/features/auth/hooks';

const DEMO_ACCOUNTS = [
  { label: 'Teacher', email: 'aanya.k@westbrook.edu' },
  { label: 'Principal', email: 'sunita.r@westbrook.edu' },
] as const;

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('aanya.k@westbrook.edu');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  const login = useLogin();

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');

  const requestErr = requestOtp.error instanceof Error ? requestOtp.error.message : null;
  const verifyErr = verifyOtp.error instanceof Error ? verifyOtp.error.message : null;

  const handleSendOtp = () => {
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
    verifyOtp.reset();
  };

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const handleLogin = () => {
    btnScale.value = withSpring(0.96, {}, () => {
      btnScale.value = withSpring(1);
    });
    login.mutate({ email, password });
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
            <Text style={styles.cardSubtitle}>Sign in to continue</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={Colors.inkMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  placeholderTextColor={Colors.inkSoft}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={Colors.inkMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.inkSoft}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.inkMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In Button */}
            <Animated.View style={btnStyle}>
              <TouchableOpacity
                style={[styles.signInBtn, login.isPending && styles.signInBtnLoading]}
                onPress={handleLogin}
                activeOpacity={0.9}
                disabled={login.isPending}
              >
                {login.isPending ? (
                  <Text style={styles.signInBtnText}>Signing in...</Text>
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* OTP login */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with OTP</Text>
              <View style={styles.dividerLine} />
            </View>

            {!otpSent ? (
              <View>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="phone-portrait-outline"
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
                  />
                </View>
                {requestErr && <Text style={styles.errorText}>{requestErr}</Text>}
                <TouchableOpacity
                  style={styles.otpBtn}
                  activeOpacity={0.85}
                  disabled={requestOtp.isPending}
                  onPress={handleSendOtp}
                >
                  <Ionicons name="paper-plane-outline" size={18} color={Colors.primary} />
                  <Text style={styles.otpBtnText}>
                    {requestOtp.isPending ? 'Sending…' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.otpSentText}>Code sent to {otpDestination}</Text>
                <Text style={styles.otpHintText}>Demo code: 123456</Text>
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
                <TouchableOpacity
                  style={[
                    styles.signInBtn,
                    styles.otpVerifyBtn,
                    verifyOtp.isPending && styles.signInBtnLoading,
                  ]}
                  activeOpacity={0.9}
                  disabled={verifyOtp.isPending}
                  onPress={handleVerifyOtp}
                >
                  <Text style={styles.signInBtnText}>
                    {verifyOtp.isPending ? 'Verifying…' : 'Verify & Sign In'}
                  </Text>
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

            {/* One-tap demo accounts */}
            <View style={styles.demoRow}>
              {DEMO_ACCOUNTS.map((acc) => (
                <TouchableOpacity
                  key={acc.email}
                  style={styles.demoChip}
                  activeOpacity={0.85}
                  disabled={login.isPending}
                  onPress={() => {
                    setEmail(acc.email);
                    setPassword('password123');
                    login.mutate({ email: acc.email, password: 'password123' });
                  }}
                >
                  <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.demoChipText}>{acc.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Biometrics */}
            <TouchableOpacity style={styles.bioBtn} activeOpacity={0.8}>
              <Ionicons name="finger-print" size={22} color={Colors.primary} />
              <Text style={styles.bioBtnText}>Use Biometrics</Text>
            </TouchableOpacity>
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
  passwordInput: {
    marginRight: 4,
  },
  eyeBtn: {
    padding: 4,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
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
  demoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  demoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  demoChipText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.rule,
  },
  dividerText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  otpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  otpBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  otpVerifyBtn: {
    marginTop: 12,
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
    marginTop: 12,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.coral,
    marginTop: 8,
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  bioBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
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
