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
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useChangePassword } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { validateNewPassword } from '@/features/auth/passwordValidation';

export const ChangePasswordScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const change = useChangePassword();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const serverErr = change.error ? authErrorMessage(change.error) : null;

  const handleSubmit = () => {
    const v = validateNewPassword(password, confirm);
    setLocalErr(v);
    if (v) return;
    change.mutate(password, { onSuccess: () => setDone(true) });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {done ? (
            <View style={styles.card}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.present} />
              <Text style={styles.doneTitle}>Password changed</Text>
              <Text style={styles.doneText}>Your password has been updated.</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.primaryBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardSubtitle}>Choose a new password for your account.</Text>
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
                  {change.isPending ? 'Saving…' : 'Update password'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.ink },
  scroll: { padding: 20 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radii.xl,
    padding: 24,
    alignItems: 'stretch',
    ...Shadows.card,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 18,
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
  doneTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 20,
    color: Colors.ink,
    marginTop: 12,
    textAlign: 'center',
  },
  doneText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    marginTop: 6,
    marginBottom: 16,
    textAlign: 'center',
  },
});
