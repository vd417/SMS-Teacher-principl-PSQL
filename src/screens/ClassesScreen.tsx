import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../theme';
import { ScreenHeader, SearchField } from '../components';
import { ClassListCard } from '@/components/classHub/ClassListCard';
import { useClasses } from '@/features/classes/hooks';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import { classLabel } from '@/lib/classLabel';
import { todayISO } from '@/lib/date';
import type { ClassesStackParamList } from '../navigation/types';

type ClassesNav = NativeStackNavigationProp<ClassesStackParamList, 'ClassHubScreen'>;

export const ClassesScreen: React.FC = () => {
  const navigation = useNavigation<ClassesNav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const { data: classes = [], isLoading, isError, refetch } = useClasses();
  const today = todayISO();

  const filtered = classes.filter(
    (c) =>
      classLabel(c.name, c.section, ' ').toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <>
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
    return filtered.map((cls, i) => (
      <ClassListCard
        key={cls.id}
        cls={cls}
        index={i}
        today={today}
        onOpenClass={() => navigation.navigate('ClassDetailScreen', { classId: cls.id })}
        onOpenAttendance={() => navigation.navigate('AttendanceScreen', { classId: cls.id })}
      />
    ));
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
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 16 },
  searchWrap: { marginBottom: 4 },
});
