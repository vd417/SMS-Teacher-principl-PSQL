import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { SectionPickerModal } from '../../components';
import type { SectionOption } from '../../components';
import { useClasses } from '@/features/classes/hooks';
import { deriveColorSet } from '@/theme/derive';
import type { PrincipalTimetableStackParamList } from '../../navigation/types';

type TimetableNav = NativeStackNavigationProp<
  PrincipalTimetableStackParamList,
  'SchoolTimetableScreen'
>;

type GradeGroup = { name: string; sections: SectionOption[] };

export const SchoolTimetableScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TimetableNav>();
  const { data: classes = [], isLoading } = useClasses();
  const [picker, setPicker] = useState<GradeGroup | null>(null);

  // Group classes by grade so the principal picks a class, then a section (popup).
  const grades = useMemo<GradeGroup[]>(() => {
    const map = new Map<string, SectionOption[]>();
    for (const c of classes) {
      const arr = map.get(c.name) ?? [];
      arr.push({ id: c.id, section: c.section, subtitle: c.room });
      map.set(c.name, arr);
    }
    return [...map.entries()].map(([name, sections]) => ({ name, sections }));
  }, [classes]);

  const openTimetable = (classId: string) => {
    setPicker(null);
    navigation.navigate('ClassTimetableScreen', { classId });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Timetable</Text>
        <Text style={styles.sub}>Select a class to view its schedule</Text>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          grades.map((g, i) => {
            const cs = deriveColorSet(g.name);
            return (
              <Animated.View key={g.name} entering={FadeInDown.delay(40 * i).springify()}>
                <TouchableOpacity
                  style={[styles.classCard, { backgroundColor: cs.color }]}
                  activeOpacity={0.88}
                  onPress={() => setPicker(g)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardClassName}>{g.name}</Text>
                    <Text style={styles.cardSubject}>
                      {g.sections.length} section{g.sections.length > 1 ? 's' : ''} · tap to choose
                    </Text>
                  </View>
                  <View style={styles.iconBadge}>
                    <Ionicons name="calendar" size={20} color={cs.color} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <SectionPickerModal
        visible={!!picker}
        gradeName={picker?.name ?? null}
        sections={picker?.sections ?? []}
        onSelect={openTimetable}
        onClose={() => setPicker(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  h1: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 16 },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.xl,
    padding: 18,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardClassName: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.white },
  cardSubject: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
