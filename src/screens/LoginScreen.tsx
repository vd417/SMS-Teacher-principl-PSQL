import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Keyboard,
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
import { useLogin } from '@/features/auth/hooks';
import { authErrorMessage } from '@/features/auth/authErrors';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import type { RootStackParamList } from '../navigation/types';

type LoginNav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<LoginNav>();

  const login = useLogin();
  const keyboardInset = useKeyboardInset();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (keyboardInset === 0) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    return () => cancelAnimationFrame(frame);
  }, [keyboardInset]);

  const togglePasswordVisibility = () => {
    passwordRef.current?.focus();
    setShowPassword((visible) => !visible);
  };

  const loginErr = login.error ? authErrorMessage(login.error) : null;

  const handleSignIn = () => {
    if (login.isPending) return;
    Keyboard.dismiss();
    login.mutate({ identifier: identifier.trim(), password });
  };

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <View style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            {
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 24 + keyboardInset,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={40} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>CatreSchoolDesk</Text>
            <Text style={styles.appTagline}>CATRE Teacher App</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back 👋</Text>
            <Text style={styles.cardSubtitle}>Sign in with your email or mobile number</Text>

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
                    ref={passwordRef}
                    style={styles.textInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={Colors.inkSoft}
                    secureTextEntry={!showPassword}
                    keyboardType={
                      Platform.OS === 'android' && showPassword ? 'visible-password' : 'default'
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity onPress={togglePasswordVisibility} hitSlop={8}>
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
                style={styles.firstTimeRow}
                onPress={() => navigation.navigate('ForgotPassword', { mode: 'create' })}
              >
                <Text style={styles.firstTimeText}>First time here? </Text>
                <Text style={styles.forgotText}>Create a password</Text>
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
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.footer}>
            <Text style={styles.footerText}>CatreSchoolDesk · Teacher</Text>
          </Animated.View>
        </ScrollView>
      </View>
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
  firstTimeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  firstTimeText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
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
