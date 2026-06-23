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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useForgotPassword, useResetPassword } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { validateNewPassword } from '@/features/auth/passwordValidation';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const forgot = useForgotPassword();
  const reset = useResetPassword();

  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const forgotErr = forgot.error ? authErrorMessage(forgot.error) : null;
  const resetErr = reset.error ? authErrorMessage(reset.error) : null;

  const handleSend = () => forgot.mutate(identifier.trim(), { onSuccess: () => setSent(true) });

  const handleReset = () => {
    const v = validateNewPassword(password, confirm);
    setLocalErr(v);
    if (v) return;
    reset.mutate(
      { identifier: identifier.trim(), code: code.trim(), password },
      { onSuccess: () => setDone(true) }
    );
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
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
            <Text style={styles.backText}>Back to sign in</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reset password</Text>

            {done ? (
              <View>
                <Text style={styles.cardSubtitle}>
                  Your password has been reset. Sign in with your new password.
                </Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.primaryBtnText}>Back to sign in</Text>
                </TouchableOpacity>
              </View>
            ) : !sent ? (
              <View>
                <Text style={styles.cardSubtitle}>
                  Enter your email or mobile number and we&rsquo;ll send a verification code.
                </Text>
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
                {forgotErr && <Text style={styles.errorText}>{forgotErr}</Text>}
                <TouchableOpacity
                  style={[styles.primaryBtn, forgot.isPending && styles.btnLoading]}
                  disabled={forgot.isPending}
                  onPress={handleSend}
                >
                  <Text style={styles.primaryBtnText}>
                    {forgot.isPending ? 'Sending…' : 'Send code'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.cardSubtitle}>
                  Enter the code we sent and choose a new password.
                </Text>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="keypad-outline"
                    size={18}
                    color={Colors.inkMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={code}
                    onChangeText={setCode}
                    placeholder="6-digit code"
                    placeholderTextColor={Colors.inkSoft}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
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
                    placeholder="New password (min 8 chars)"
                    placeholderTextColor={Colors.inkSoft}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.inputWrap}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={Colors.inkMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.inkSoft}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                {(localErr || resetErr) && (
                  <Text style={styles.errorText}>{localErr ?? resetErr}</Text>
                )}
                <TouchableOpacity
                  style={[styles.primaryBtn, reset.isPending && styles.btnLoading]}
                  disabled={reset.isPending}
                  onPress={handleReset}
                >
                  <Text style={styles.primaryBtnText}>
                    {reset.isPending ? 'Resetting…' : 'Reset password'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendRow}
                  onPress={handleSend}
                  disabled={forgot.isPending}
                >
                  <Text style={styles.forgotText}>Resend code</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.white },
  card: { backgroundColor: Colors.white, borderRadius: Radii.xl, padding: 28, ...Shadows.pop },
  cardTitle: { fontFamily: FontFamily.extraBold, fontSize: 24, color: Colors.ink, marginBottom: 6 },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 20,
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
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  textInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    padding: 0,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    ...Shadows.card,
  },
  btnLoading: { opacity: 0.8 },
  primaryBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  forgotText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  resendRow: { alignItems: 'center', marginTop: 16 },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.coral,
    marginTop: 2,
    marginBottom: 6,
  },
});
