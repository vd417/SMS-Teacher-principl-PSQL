import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useClasses } from '@/features/classes/hooks';
import { useSectionAttendanceSummaries } from '@/features/attendance/hooks';
import { deriveColorSet } from '@/theme/derive';
import { todayISO } from '@/lib/date';
import { gradeLabel, sectionLabel } from '@/lib/classLabel';
import type { HomeStackParamList } from '../navigation/types';

type AttPickSectionNav = NativeStackNavigationProp<HomeStackParamList, 'AttendancePickSection'>;
type AttPickSectionRoute = RouteProp<HomeStackParamList, 'AttendancePickSection'>;

export const AttendancePickSectionScreen: React.FC = () => {
  const navigation = useNavigation<AttPickSectionNav>();
  const route = useRoute<AttPickSectionRoute>();
  const insets = useSafeAreaInsets();
  const { gradeName } = route.params;

  const today = todayISO();
  const { data: classes = [], isLoading, isError } = useClasses();
  const sections = useMemo(() => classes.filter((c) => c.name === gradeName), [classes, gradeName]);
  const { bySection, isLoading: summariesLoading } = useSectionAttendanceSummaries(
    sections.map((c) => c.id),
    today
  );

  const openAttendance = (classId: string) => {
    navigation.navigate('AttendanceScreen', { classId });
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

      <View style={styles.grid}>
        {sections.map((c, i) => {
          const cs = deriveColorSet(c.id);
          const total = bySection[c.id]?.total;
          const subtitle = summariesLoading
            ? undefined
            : `${total ?? 0} student${(total ?? 0) === 1 ? '' : 's'}`;
          return (
            <Animated.View
              key={c.id}
              entering={FadeInDown.delay(100 + i * 60).springify()}
              style={styles.optionWrap}
            >
              <TouchableOpacity
                style={[styles.option, { backgroundColor: cs.colorSoft, borderColor: cs.color }]}
                activeOpacity={0.85}
                onPress={() => openAttendance(c.id)}
              >
                <View style={[styles.badge, { backgroundColor: cs.color }]}>
                  <Text style={styles.badgeText}>{c.section}</Text>
                </View>
                <Text style={[styles.optionLabel, { color: cs.color }]}>
                  {sectionLabel(c.section)}
                </Text>
                {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
              </TouchableOpacity>
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
  center: { paddingVertical: 40, alignItems: 'center' },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  optionWrap: { flexGrow: 1, flexBasis: '44%' },
  option: {
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    ...Shadows.card,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FontFamily.extraBold, fontSize: 18, color: Colors.white },
  optionLabel: { fontFamily: FontFamily.bold, fontSize: 15 },
  optionSub: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
});
