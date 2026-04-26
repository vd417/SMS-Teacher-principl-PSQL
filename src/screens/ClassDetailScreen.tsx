import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Pill, ScreenHeader } from '../components';
import { classes, students } from '../data';
import type { ClassesStackParamList } from '../navigation/types';

type ClassDetailNav = NativeStackNavigationProp<ClassesStackParamList, 'ClassDetailScreen'>;
type ClassDetailRoute = RouteProp<ClassesStackParamList, 'ClassDetailScreen'>;

export const ClassDetailScreen: React.FC = () => {
  const navigation = useNavigation<ClassDetailNav>();
  const route = useRoute<ClassDetailRoute>();
  const insets = useSafeAreaInsets();
  const { classId } = route.params;

  const cls = classes.find((c) => c.id === classId)!;
  const classStudents = students.filter((s) => s.classId === classId);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <LinearGradient
        colors={[cls.color, cls.colorSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.heroClass}>
          {cls.name} – {cls.section}
        </Text>
        <Text style={styles.heroSubject}>{cls.subject}</Text>
        <View style={styles.heroMeta}>
          <View style={styles.heroMetaItem}>
            <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroMetaText}>{classStudents.length} students</Text>
          </View>
          <View style={styles.heroMetaItem}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.heroMetaText}>{cls.room}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Action Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AttendanceScreen', { classId })}
        >
          <Ionicons name="checkmark-circle" size={24} color={Colors.present} />
          <Text style={styles.actionLabel}>Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="document-text" size={24} color={Colors.coral} />
          <Text style={styles.actionLabel}>Exams</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="ribbon" size={24} color={Colors.blue} />
          <Text style={styles.actionLabel}>Grades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard}>
          <Ionicons name="book" size={24} color={Colors.late} />
          <Text style={styles.actionLabel}>Work</Text>
        </TouchableOpacity>
      </View>

      {/* Students */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Students ({classStudents.length})</Text>
        </View>
        {classStudents.map((student, i) => (
          <Animated.View key={student.id} entering={FadeInDown.delay(i * 40).springify()}>
            <TouchableOpacity
              style={styles.studentRow}
              onPress={() => navigation.navigate('StudentScreen', { studentId: student.id })}
            >
              <Avatar initials={student.initials} size={44} backgroundColor={cls.color} />
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentRoll}>Roll #{student.roll}</Text>
              </View>
              <View style={styles.studentRight}>
                <View
                  style={[
                    styles.attBadge,
                    {
                      backgroundColor:
                        student.attendance >= 90
                          ? Colors.presentSoft
                          : student.attendance >= 75
                            ? Colors.lateSoft
                            : Colors.absentSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.attText,
                      {
                        color:
                          student.attendance >= 90
                            ? Colors.present
                            : student.attendance >= 75
                              ? Colors.late
                              : Colors.absent,
                      },
                    ]}
                  >
                    {student.attendance}%
                  </Text>
                </View>
                <Pill
                  label={student.grade}
                  color={cls.color}
                  backgroundColor={cls.colorSoft}
                  size="sm"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  scroll: {},
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
  heroClass: {
    fontFamily: FontFamily.extraBold,
    fontSize: 28,
    color: Colors.white,
  },
  heroSubject: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    marginBottom: 16,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: -16,
    marginBottom: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    ...Shadows.pop,
  },
  actionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.ink3,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.ink,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  studentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  studentName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.ink,
  },
  studentRoll: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  studentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attBadge: {
    borderRadius: Radii.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  attText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
  },
});
