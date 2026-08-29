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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar, ScreenHeader, Pill } from '../../components';
import { useAssignments } from '@/features/assignments/hooks';
import { useExams } from '@/features/exams/hooks';
import { useClasses } from '@/features/classes/hooks';
import { useTimetable } from '@/features/timetable/hooks';
import { classIdsForTeacher } from '@/lib/academicsScope';
import { classLabel } from '@/lib/classLabel';
import type { PrincipalHomeStackParamList } from '../../navigation/types';

type Route = RouteProp<PrincipalHomeStackParamList, 'TeacherAcademicsScreen'>;
type Nav = NativeStackNavigationProp<PrincipalHomeStackParamList, 'TeacherAcademicsScreen'>;

export const TeacherAcademicsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { teacherId, teacherName } = route.params;

  const { data: classes = [] } = useClasses();
  const { data: timetable = [] } = useTimetable();
  const { data: homework = [], isLoading: hwLoading } = useAssignments();
  const { data: exams = [], isLoading: exLoading } = useExams();

  const classIds = useMemo(
    () => classIdsForTeacher(teacherId, teacherName, classes, timetable),
    [teacherId, teacherName, classes, timetable]
  );

  const teacherClasses = useMemo(
    () => classes.filter((c) => classIds.has(c.id)),
    [classes, classIds]
  );

  const teacherHomework = useMemo(
    () => homework.filter((h) => h.classId && classIds.has(h.classId)),
    [homework, classIds]
  );

  const teacherExams = useMemo(
    () => exams.filter((e) => classIds.has(e.classId)),
    [exams, classIds]
  );

  const initials = teacherName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={teacherName} subtitle="Homework & tests by teacher" showBack />

      <View style={styles.hero}>
        <Avatar initials={initials || 'T'} size={56} backgroundColor={Colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName}>{teacherName}</Text>
          <Text style={styles.heroMeta}>
            {teacherClasses.length} class{teacherClasses.length === 1 ? '' : 'es'} ·{' '}
            {teacherHomework.length} homework · {teacherExams.length} tests
          </Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <TouchableOpacity
          style={styles.summaryCard}
          onPress={() => navigation.navigate('AssignmentsScreen', { teacherId, teacherName })}
        >
          <Ionicons name="book-outline" size={22} color={Colors.orange} />
          <Text style={styles.summaryCount}>{teacherHomework.length}</Text>
          <Text style={styles.summaryLabel}>Homework</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.summaryCard}
          onPress={() => navigation.navigate('ExamsScreen', { teacherId, teacherName })}
        >
          <Ionicons name="document-text-outline" size={22} color={Colors.coral} />
          <Text style={styles.summaryCount}>{teacherExams.length}</Text>
          <Text style={styles.summaryLabel}>Tests</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Classes</Text>
      {teacherClasses.length === 0 ? (
        <Text style={styles.muted}>No classes linked via homeroom or timetable.</Text>
      ) : (
        teacherClasses.map((c) => {
          const hw = teacherHomework.filter((h) => h.classId === c.id).length;
          const ex = teacherExams.filter((e) => e.classId === c.id).length;
          return (
            <View key={c.id} style={styles.classRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.className}>{classLabel(c.name, c.section, ' – ')}</Text>
                <Text style={styles.classMeta}>{c.subject || '—'}</Text>
              </View>
              <Pill
                label={`${hw} HW`}
                color={Colors.orange}
                backgroundColor={Colors.lateSoft}
                size="sm"
              />
              <Pill
                label={`${ex} tests`}
                color={Colors.coral}
                backgroundColor={Colors.coralSoft}
                size="sm"
              />
            </View>
          );
        })
      )}

      <Text style={styles.sectionTitle}>Recent homework</Text>
      {hwLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : teacherHomework.length === 0 ? (
        <Text style={styles.muted}>No homework for this teacher&apos;s classes.</Text>
      ) : (
        teacherHomework.slice(0, 5).map((h) => (
          <View key={h.id} style={styles.itemRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {h.title}
            </Text>
            <Text style={styles.itemMeta}>
              {h.className} · due {h.dueDate}
            </Text>
          </View>
        ))
      )}

      <Text style={styles.sectionTitle}>Upcoming tests</Text>
      {exLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : teacherExams.length === 0 ? (
        <Text style={styles.muted}>No published tests for this teacher&apos;s classes.</Text>
      ) : (
        teacherExams.slice(0, 5).map((e) => (
          <View key={e.id} style={styles.itemRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {e.title}
            </Text>
            <Text style={styles.itemMeta}>
              {e.className} · {e.date}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 16,
    marginTop: 8,
    ...Shadows.card,
  },
  heroName: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.ink },
  heroMeta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    ...Shadows.card,
  },
  summaryCount: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.ink },
  summaryLabel: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.inkMuted },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.ink,
    marginTop: 8,
    marginBottom: 4,
  },
  muted: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  className: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.ink },
  classMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  itemRow: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  itemTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.ink },
  itemMeta: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted, marginTop: 4 },
});
