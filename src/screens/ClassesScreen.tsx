import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, SearchField } from '../components';
import { useClasses } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import { classLabel } from '@/lib/classLabel';
import type { ClassesStackParamList } from '../navigation/types';

type ClassesNav = NativeStackNavigationProp<ClassesStackParamList, 'ClassesScreen'>;

export const ClassesScreen: React.FC = () => {
  const navigation = useNavigation<ClassesNav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data: classes = [], isLoading, isError, refetch } = useClasses();

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
          <Skeleton height={84} />
          <Skeleton height={84} />
          <Skeleton height={84} />
          <Skeleton height={84} />
        </>
      );
    }
    if (isError) {
      return <ErrorState onRetry={refetch} />;
    }
    if (filtered.length === 0) {
      return <EmptyState label="No classes yet" />;
    }
    return filtered.map((cls, i) => {
      const cs = deriveColorSet(cls.id);
      return (
        <Animated.View key={cls.id} entering={FadeInDown.delay(140 + i * 60).springify()}>
          <TouchableOpacity
            style={[styles.classCard, { backgroundColor: cs.color }]}
            onPress={() => navigation.navigate('ClassDetailScreen', { classId: cls.id })}
            activeOpacity={0.88}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.className}>{classLabel(cls.name, cls.section, ' – ')}</Text>
                <Text style={styles.classSubject}>{cls.subject}</Text>
              </View>
              <View style={styles.iconBadge}>
                <Ionicons name="school" size={22} color={cs.color} />
              </View>
            </View>

            <View style={styles.cardInfo}>
              <View style={styles.infoItem}>
                <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.infoText}>{cls.studentCount} Students</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.infoText}>{cls.room}</Text>
              </View>
              {cls.nextPeriod && (
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.infoText}>{cls.nextPeriod}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('AttendanceScreen', { classId: cls.id })}
              >
                <Ionicons name="checkmark-done" size={14} color={cs.color} />
                <Text style={[styles.actionBtnText, { color: cs.color }]}>Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('ClassDetailScreen', { classId: cls.id })}
              >
                <Ionicons name="people" size={14} color={cs.color} />
                <Text style={[styles.actionBtnText, { color: cs.color }]}>Students</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="My Classes" subtitle={`${classes.length} classes`} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchWrap}>
        <SearchField placeholder="Search classes..." value={search} onChangeText={setSearch} />
      </Animated.View>

      {renderContent()}
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
    gap: 16,
  },
  searchWrap: {
    marginBottom: 4,
  },
  classCard: {
    borderRadius: Radii.xl,
    padding: 20,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  className: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.white,
  },
  classSubject: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
  },
});
