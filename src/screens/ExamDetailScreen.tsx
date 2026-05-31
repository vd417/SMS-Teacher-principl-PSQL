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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Card, Pill } from '../components';
import { useExam, useDeleteExam } from '../features/exams/hooks';
import { deriveColorSet } from '../theme/derive';
import type { HomeStackParamList } from '../navigation/types';

type ExamDetailRoute = RouteProp<HomeStackParamList, 'ExamDetail'>;

const STATUS_COLORS: Record<string, string> = {
  upcoming: Colors.blue,
  completed: Colors.present,
  draft: Colors.inkMuted,
};

export const ExamDetailScreen: React.FC = () => {
  const route = useRoute<ExamDetailRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { examId } = route.params;

  const { data: exam, isLoading, isError } = useExam(examId);
  const deleteExam = useDeleteExam();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (isError || !exam) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Failed to load exam.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtnSimple}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { color, colorSoft } = deriveColorSet(exam.id);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[color, colorSoft]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Pill
          label={exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
          color={STATUS_COLORS[exam.status] ?? color}
          backgroundColor="rgba(255,255,255,0.9)"
          style={styles.statusPill}
        />
        <Text style={styles.heroTitle}>{exam.title}</Text>
        <Text style={styles.heroClass}>
          {exam.className} · {exam.subject}
        </Text>
      </LinearGradient>

      <View style={styles.body}>
        {/* Quick Stats */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.statsRow}>
          {[
            { icon: 'time-outline', label: 'Duration', value: `${exam.duration} min` },
            { icon: 'checkmark-circle-outline', label: 'Max Marks', value: String(exam.maxMarks) },
            { icon: 'calendar-outline', label: 'Date', value: exam.date },
          ].map((s) => (
            <Card key={s.label} style={styles.statCard} padding={12}>
              <Ionicons name={s.icon as never} size={20} color={Colors.primary} />
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </Card>
          ))}
        </Animated.View>

        {/* Details */}
        <Animated.View entering={FadeInDown.delay(140).springify()}>
          <Text style={styles.sectionTitle}>Exam Details</Text>
          <Card padding={0}>
            {[
              { icon: 'time-outline', label: 'Time', value: exam.time },
              { icon: 'calendar-outline', label: 'Date', value: exam.date },
              { icon: 'hourglass-outline', label: 'Duration', value: `${exam.duration} minutes` },
              { icon: 'trophy-outline', label: 'Total Marks', value: String(exam.maxMarks) },
              { icon: 'school-outline', label: 'Class', value: exam.className },
            ].map((item, i, arr) => (
              <View
                key={item.label}
                style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}
              >
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as never} size={17} color={Colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Topics */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={styles.sectionTitle}>Topics Covered</Text>
          <Card>
            <View style={styles.topicsWrap}>
              {exam.topics.map((topic) => (
                <View key={topic} style={styles.topicChip}>
                  <Text style={styles.topicText}>{topic}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Actions */}
        {exam.status !== 'completed' && (
          <Animated.View entering={FadeInDown.delay(260).springify()} style={styles.actions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]}>
              <Ionicons name="create-outline" size={18} color={Colors.white} />
              <Text style={styles.actionBtnText}>Edit Exam</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnSecondary}>
              <Ionicons name="notifications-outline" size={18} color={Colors.primary} />
              <Text style={styles.actionBtnSecondaryText}>Notify Students</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnDanger}
              onPress={() => {
                deleteExam.mutate(exam.id, {
                  onSuccess: () => navigation.goBack(),
                });
              }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.absent} />
              <Text style={styles.actionBtnDangerText}>Delete Exam</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: {},
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  backBtnSimple: { marginTop: 12 },
  backBtnText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.primary },
  hero: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusPill: { marginBottom: 12 },
  heroTitle: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.white },
  heroClass: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  body: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontFamily: FontFamily.extraBold, fontSize: 15, color: Colors.ink },
  statLbl: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.inkMuted },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: 10 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.ruleSoft },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  infoValue: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink, marginTop: 1 },
  topicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  topicChip: {
    backgroundColor: Colors.primarySoft,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  topicText: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  actions: { gap: 12 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radii.full,
    height: 50,
    ...Shadows.card,
  },
  actionBtnText: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.white },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radii.full,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.primarySoft2,
    backgroundColor: Colors.primarySoft,
  },
  actionBtnSecondaryText: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.primary },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radii.full,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.absentSoft ?? Colors.ruleSoft,
    backgroundColor: Colors.absentSoft ?? Colors.ruleSoft,
  },
  actionBtnDangerText: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.absent },
});
