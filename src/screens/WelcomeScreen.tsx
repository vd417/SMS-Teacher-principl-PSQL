import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import type { RootStackParamList } from '../navigation/types';

const HIGHLIGHTS = [
  { icon: 'checkmark-circle-outline' as const, text: 'Attendance, marks & timetables' },
  { icon: 'chatbubbles-outline' as const, text: 'Stay in touch with your school' },
  { icon: 'shield-checkmark-outline' as const, text: 'Secure one-time-code sign in' },
];

export const WelcomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 28 },
        ]}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.hero}>
          <View style={styles.logoCircle}>
            <Ionicons name="school" size={46} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>School Desk</Text>
          <Text style={styles.appTagline}>School Management System</Text>
        </Animated.View>

        {/* Highlights */}
        <Animated.View entering={FadeIn.delay(350)} style={styles.highlights}>
          {HIGHLIGHTS.map((h) => (
            <View key={h.text} style={styles.highlightRow}>
              <Ionicons name={h.icon} size={20} color={Colors.white} />
              <Text style={styles.highlightText}>{h.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(450).springify()} style={styles.footer}>
          <TouchableOpacity
            style={styles.getStartedBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.footerNote}>Westbrook Academy · v1.0.0</Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    marginTop: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...Shadows.pop,
  },
  appName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 34,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  appTagline: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  highlights: {
    gap: 16,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  highlightText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  footer: {
    gap: 18,
  },
  getStartedBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Shadows.pop,
  },
  getStartedText: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  footerNote: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
  },
});
