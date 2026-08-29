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
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader } from '../components';
import { useClasses } from '@/features/classes/hooks';
import { useExams } from '../features/exams/hooks';
import { deriveColorSet } from '@/theme/derive';
import { classLabel } from '@/lib/classLabel';
import type { Exam } from '@/data/domain';
import type { HomeStackParamList } from '../navigation/types';

type MarksExamNav = NativeStackNavigationProp<HomeStackParamList, 'MarksPickExam'>;
type MarksExamRoute = RouteProp<HomeStackParamList, 'MarksPickExam'>;

export const MarksPickExamScreen: React.FC = () => {
  const navigation = useNavigation<MarksExamNav>();
  const route = useRoute<MarksExamRoute>();
  const insets = useSafeAreaInsets();
  const { classId } = route.params;

  const { data: classes = [], isLoading: classesLoading } = useClasses();
  const { data: exams = [], isLoading: examsLoading } = useExams();

  const cls = classes.find((c) => c.id === classId);
  const cs = deriveColorSet(classId);

  const classExams = useMemo(() => {
    const list = exams.filter((e) => e.classId === classId);
    return list as Exam[];
  }, [exams, classId]);

  const isLoading = classesLoading || examsLoading;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader
          title="Enter Marks"
          subtitle={cls ? classLabel(cls.name, cls.section, ' – ') : 'Select a subject'}
          showBack
        />
      </Animated.View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : classExams.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No exams for this class yet</Text>
        </View>
      ) : (
        classExams.map((ex, i) => (
          <Animated.View key={ex.id} entering={FadeInDown.delay(120 + i * 60).springify()}>
            <TouchableOpacity
              style={[styles.examChip, { borderColor: cs.color }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('MarksEntryScreen', { examId: ex.id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.examSubject, { color: cs.color }]}>{ex.subject}</Text>
                <Text style={styles.examTitle}>
                  {ex.title} · /{ex.maxMarks}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={cs.color} />
            </TouchableOpacity>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
  },
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
});
