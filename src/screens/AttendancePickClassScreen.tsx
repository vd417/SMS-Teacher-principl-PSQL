import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useClasses } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
import type { HomeStackParamList } from '../navigation/types';

type AttPickNav = NativeStackNavigationProp<HomeStackParamList, 'AttendancePickClass'>;

export const AttendancePickClassScreen: React.FC = () => {
  const navigation = useNavigation<AttPickNav>();
  const insets = useSafeAreaInsets();

  const { data: classes = [], isLoading, isError } = useClasses();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Mark Attendance" subtitle="Select a class to continue" showBack />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.dateCard}>
        <Ionicons name="calendar" size={18} color={Colors.primary} />
        <Text style={styles.dateText}>Monday, 27 April 2026</Text>
      </Animated.View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load classes</Text>
        </View>
      )}

      {!isLoading && !isError && classes.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No classes found</Text>
        </View>
      )}

      {classes.map((cls, i) => {
        const { color } = deriveColorSet(cls.id);
        return (
          <Animated.View key={cls.id} entering={FadeInDown.delay(140 + i * 60).springify()}>
            <TouchableOpacity
              style={styles.classCard}
              onPress={() => navigation.navigate('AttendanceScreen', { classId: cls.id })}
              activeOpacity={0.85}
            >
              <View style={[styles.classColor, { backgroundColor: color }]}>
                <Ionicons name="school" size={22} color={Colors.white} />
              </View>
              <View style={styles.classInfo}>
                <Text style={styles.className}>
                  {cls.name} – {cls.section}
                </Text>
                <Text style={styles.classSubject}>{cls.subject}</Text>
                <Text style={styles.classCount}>
                  {cls.studentCount} students · {cls.room}
                </Text>
              </View>
              <View style={styles.arrowWrap}>
                <Ionicons name="chevron-forward" size={20} color={Colors.inkSoft} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dateText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 16,
    ...Shadows.card,
  },
  classColor: {
    width: 54,
    height: 54,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.ink,
  },
  classSubject: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  classCount: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkSoft,
    marginTop: 4,
  },
  arrowWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.absent,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
  },
});
