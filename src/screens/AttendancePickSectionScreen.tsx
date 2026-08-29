import React, { useMemo, useState } from 'react';

import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import Animated, { FadeInDown } from 'react-native-reanimated';

import { Colors } from '../theme';

import { FontFamily } from '../theme/typography';

import { ScreenHeader, SearchField } from '../components';

import { AttendanceSectionTile } from '../components/attendance/AttendanceSectionTile';

import { useClasses } from '@/features/classes/hooks';

import { useSectionAttendanceSummaries } from '@/features/attendance/hooks';

import { todayISO } from '@/lib/date';

import { gradeLabel, sectionLabel, classGroupKey } from '@/lib/classLabel';

import { sortBySection } from '@/lib/gradeSort';

import type { AttendanceSectionStackParamList } from '../navigation/types';
import { resolveFlow } from '../navigation/classSectionFlow';

type AttPickSectionNav = NativeStackNavigationProp<
  AttendanceSectionStackParamList,
  'AttendancePickSection'
>;

type AttPickSectionRoute = RouteProp<AttendanceSectionStackParamList, 'AttendancePickSection'>;

export const AttendancePickSectionScreen: React.FC = () => {
  const navigation = useNavigation<AttPickSectionNav>();

  const route = useRoute<AttPickSectionRoute>();

  const insets = useSafeAreaInsets();

  const { gradeName } = route.params;
  const flow = resolveFlow(route.params.flow);
  const isAttendance = flow === 'attendance';

  const [search, setSearch] = useState('');

  const today = todayISO();

  const { data: classes = [], isLoading, isError } = useClasses();

  const sections = useMemo(
    () =>
      sortBySection(
        classes.filter((c) => classGroupKey(c) === gradeName),
        (c) => c.section
      ),

    [classes, gradeName]
  );

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return sections;

    return sections.filter(
      (c) =>
        c.section.toLowerCase().includes(q) || sectionLabel(c.section).toLowerCase().includes(q)
    );
  }, [sections, search]);

  const { bySection, isLoading: summariesLoading } = useSectionAttendanceSummaries(
    isAttendance ? sections.map((c) => c.id) : [],
    today
  );

  const openSection = (classId: string) => {
    switch (flow) {
      case 'marks':
        (
          navigation as AttPickSectionNav & { navigate: (name: string, params: object) => void }
        ).navigate('MarksPickExam', { classId });
        break;
      case 'timetable':
        (
          navigation as AttPickSectionNav & { navigate: (name: string, params: object) => void }
        ).navigate('ClassTimetableScreen', { classId });
        break;
      default:
        navigation.navigate('AttendanceScreen', { classId });
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title={gradeLabel(gradeName)} subtitle="Choose a section" showBack />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.searchWrap}>
        <SearchField placeholder="Search section..." value={search} onChangeText={setSearch} />
      </Animated.View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load sections</Text>
        </View>
      )}

      {!isLoading && !isError && sections.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No sections found</Text>
        </View>
      )}

      {!isLoading && !isError && sections.length > 0 && filteredSections.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No matching sections</Text>
        </View>
      )}

      <View style={styles.grid}>
        {filteredSections.map((c, i) => {
          const total = bySection[c.id]?.total;
          const subtitle = isAttendance
            ? summariesLoading
              ? undefined
              : `${total ?? 0} student${(total ?? 0) === 1 ? '' : 's'}`
            : `${c.studentCount} student${c.studentCount === 1 ? '' : 's'}`;

          return (
            <Animated.View
              key={c.id}
              entering={FadeInDown.delay(100 + i * 60).springify()}
              style={styles.optionWrap}
            >
              <AttendanceSectionTile
                gradeName={gradeName}
                section={c.section}
                subtitle={subtitle}
                onPress={() => openSection(c.id)}
              />
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },

  scroll: { paddingHorizontal: 20, gap: 12 },

  searchWrap: { marginBottom: 4 },

  center: { paddingVertical: 40, alignItems: 'center' },

  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },

  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  optionWrap: { flexGrow: 1, flexBasis: '44%' },
});
