import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMySchools } from '@/features/auth/useMySchools';
import { authErrorMessage } from '@/features/auth/authErrors';

export const SchoolPickerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { pendingSchools, switchSchool } = useAuth();
  const { data: fetchedSchools } = useMySchools();
  const [pickingId, setPickingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePick = async (tenantId: string) => {
    setError(null);
    setPickingId(tenantId);
    try {
      await switchSchool(tenantId);
    } catch (err) {
      setError(authErrorMessage(err));
      setPickingId(null);
    }
  };

  const schools = pendingSchools ?? fetchedSchools ?? [];

  return (
    <LinearGradient
      colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
    >
      <StatusBar style="light" />
      <View
        style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="business" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.title}>Choose a school</Text>
          <Text style={styles.subtitle}>Your account is linked to more than one school</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(220).springify()} style={styles.card}>
          {schools.map((school, i) => {
            const isPicking = pickingId === school.id;
            const disabled = pickingId !== null;
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
                {isPicking ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
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
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.coral,
    marginTop: 16,
    textAlign: 'center',
  },
});
