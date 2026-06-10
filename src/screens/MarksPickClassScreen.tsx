import React, { useMemo, useState } from 'react';
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
import { useExams } from '../features/exams/hooks';
import { deriveColorSet } from '@/theme/derive';
import type { Exam } from '@/data/domain';
import type { HomeStackParamList } from '../navigation/types';

type MarksNav = NativeStackNavigationProp<HomeStackParamList, 'MarksPickClass'>;

export const MarksPickClassScreen: React.FC = () => {
  const navigation = useNavigation<MarksNav>();
  const insets = useSafeAreaInsets();

  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const { data: exams = [], isLoading: examsLoading } = useExams();
  const [expanded, setExpanded] = useState<string | null>(null);

  const examsByClass = useMemo(() => {
    const map = new Map<string, Exam[]>();
    for (const e of exams) {
      const arr = map.get(e.classId) ?? [];
      arr.push(e);
      map.set(e.classId, arr);
    }
    return map;
  }, [exams]);

  const isLoading = classesLoading || examsLoading;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Enter Marks" subtitle="Select a class, then a subject" showBack />
      </Animated.View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        classes.map((cls, i) => {
          const cs = deriveColorSet(cls.id);
          const classExams = examsByClass.get(cls.id) ?? [];
          const isOpen = expanded === cls.id;
          return (
            <Animated.View key={cls.id} entering={FadeInDown.delay(120 + i * 60).springify()}>
              <TouchableOpacity
                style={[styles.classCard, isOpen && { borderColor: cs.color, borderWidth: 1.5 }]}
                onPress={() => setExpanded(isOpen ? null : cls.id)}
                activeOpacity={0.85}
              >
                <View style={[styles.classIcon, { backgroundColor: cs.color }]}>
                  <Ionicons name="create" size={22} color={Colors.white} />
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.className}>
                    {cls.name} – {cls.section}
                  </Text>
                  <Text style={styles.classMeta}>
                    {classExams.length} subject{classExams.length === 1 ? '' : 's'} · tap to choose
                  </Text>
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={isOpen ? cs.color : Colors.inkSoft}
                />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.examWrap}>
                  {classExams.length === 0 ? (
                    <Text style={styles.noExam}>No exams for this class yet</Text>
                  ) : (
                    classExams.map((ex) => (
                      <TouchableOpacity
                        key={ex.id}
                        style={[styles.examChip, { borderColor: cs.color }]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('MarksEntryScreen', { examId: ex.id })}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.examSubject, { color: cs.color }]}>
                            {ex.subject}
                          </Text>
                          <Text style={styles.examTitle}>
                            {ex.title} · /{ex.maxMarks}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={cs.color} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 16,
    ...Shadows.card,
  },
  classIcon: {
    width: 54,
    height: 54,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  classInfo: { flex: 1 },
  className: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.ink },
  classMeta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted, marginTop: 3 },
  examWrap: { gap: 8, paddingTop: 10, paddingHorizontal: 4 },
  examChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    padding: 14,
    ...Shadows.card,
  },
  examSubject: { fontFamily: FontFamily.bold, fontSize: 15 },
  examTitle: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  noExam: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
});
