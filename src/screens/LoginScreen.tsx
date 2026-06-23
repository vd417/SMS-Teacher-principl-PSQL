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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useLogin, useRequestOtp, useVerifyOtp } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import type { RootStackParamList } from '../navigation/types';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type Mode = 'password' | 'otp';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LoginNav>();

  const login = useLogin();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const [mode, setMode] = useState<Mode>('password');

  // password mode
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // otp mode
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');

  const loginErr = login.error ? authErrorMessage(login.error) : null;
  const requestErr = requestOtp.error ? authErrorMessage(requestOtp.error) : null;
  const verifyErr = verifyOtp.error ? authErrorMessage(verifyOtp.error) : null;

  const handleSignIn = () => login.mutate({ identifier: identifier.trim(), password });

  const handleSendOtp = () => {
    verifyOtp.reset();
    setOtpCode('');
    requestOtp.mutate(otpIdentifier.trim(), {
      onSuccess: (challenge) => {
        setOtpDestination(challenge.destination);
        setOtpSent(true);
      },
    });
  };
  const handleVerifyOtp = () =>
    verifyOtp.mutate({ identifier: otpIdentifier.trim(), code: otpCode });
  const handleChangeIdentifier = () => {
    setOtpSent(false);
    setOtpCode('');
    setOtpDestination('');
    verifyOtp.reset();
    requestOtp.reset();
  };
  const switchMode = (next: Mode) => {
    setMode(next);
    login.reset();
    requestOtp.reset();
    verifyOtp.reset();
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
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>School Desk</Text>
            <Text style={styles.appTagline}>School Management System</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back 👋</Text>
            <Text style={styles.cardSubtitle}>
              {mode === 'password'
                ? 'Sign in with your email or mobile number'
                : otpSent
                  ? 'Enter the code we sent you'
                  : 'Sign in with a one-time code to your mobile or email'}
            </Text>

            {mode === 'password' ? (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email or Mobile Number</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={Colors.inkMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={identifier}
                      onChangeText={setIdentifier}
                      placeholder="Email or mobile number"
                      placeholderTextColor={Colors.inkSoft}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

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
                      style={styles.textInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Password"
                      placeholderTextColor={Colors.inkSoft}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={Colors.inkMuted}
                      />
                    </TouchableOpacity>
                  </View>
                  {loginErr && <Text style={styles.errorText}>{loginErr}</Text>}
                </View>

                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[styles.forgotText, styles.forgotRight]}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.signInBtn, login.isPending && styles.signInBtnLoading]}
                  activeOpacity={0.9}
                  disabled={login.isPending}
                  onPress={handleSignIn}
                >
                  {login.isPending ? (
                    <Text style={styles.signInBtnText}>Signing in…</Text>
                  ) : (
                    <>
                      <Text style={styles.signInBtnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.altLink} onPress={() => switchMode('otp')}>
                  <Text style={styles.altLinkText}>Sign in with a one-time code instead</Text>
                </TouchableOpacity>
              </View>
            ) : !otpSent ? (
              <View>
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

                <TouchableOpacity style={styles.altLink} onPress={() => switchMode('password')}>
                  <Text style={styles.altLinkText}>Use password instead</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
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

                <TouchableOpacity style={styles.altLink} onPress={() => switchMode('password')}>
                  <Text style={styles.altLinkText}>Use password instead</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

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
  forgotText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  forgotRight: {
    alignSelf: 'flex-end',
    marginBottom: 16,
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
  otpLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  altLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  altLinkText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
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
