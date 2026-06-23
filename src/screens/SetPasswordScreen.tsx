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
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useAuth } from '@/features/auth/AuthProvider';
import { useChangePassword } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { validateNewPassword } from '@/features/auth/passwordValidation';

// Shown after sign-in when the backend flags an account as having no password yet.
// On success we sign the user out so they re-enter with the password they just set
// (re-login refreshes /me and clears the mustSetPassword flag).
export const SetPasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { signOut, session } = useAuth();
  const change = useChangePassword();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);

  const serverErr = change.error ? authErrorMessage(change.error) : null;

  const handleSubmit = () => {
    const v = validateNewPassword(password, confirm);
    setLocalErr(v);
    if (v) return;
    change.mutate(password, { onSuccess: () => signOut() });
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
            { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Set your password</Text>
            <Text style={styles.cardSubtitle}>
              Welcome{session?.user.name ? `, ${session.user.name}` : ''}. Create a password to
              finish setting up your account.
            </Text>
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
            {(localErr || serverErr) && (
              <Text style={styles.errorText}>{localErr ?? serverErr}</Text>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, change.isPending && styles.btnLoading]}
              disabled={change.isPending}
              onPress={handleSubmit}
            >
              <Text style={styles.primaryBtnText}>
                {change.isPending ? 'Saving…' : 'Set password & continue'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutRow} onPress={() => signOut()}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...Shadows.card,
  },
  btnLoading: { opacity: 0.8 },
  primaryBtnText: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.white },
  errorText: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.coral, marginBottom: 6 },
  signOutRow: { alignItems: 'center', marginTop: 18 },
  signOutText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
});
