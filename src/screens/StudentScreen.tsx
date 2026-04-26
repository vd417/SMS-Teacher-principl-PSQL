import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, Card, Donut, Pill } from '../components';
import { students, classes } from '../data';
import type { HomeStackParamList } from '../navigation/types';

type StudentRoute = RouteProp<HomeStackParamList, 'StudentScreen'>;

export const StudentScreen: React.FC = () => {
  const route = useRoute<StudentRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { studentId } = route.params;

  const student = students.find((s) => s.id === studentId)!;
  const cls = classes.find((c) => c.id === student.classId)!;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[cls.color, cls.colorSoft]}
        style={[styles.hero, { paddingTop: insets.top + 16 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <Avatar initials={student.initials} size={72} backgroundColor="rgba(255,255,255,0.25)" />
        <Text style={styles.heroName}>{student.name}</Text>
        <Text style={styles.heroRole}>
          {cls.name}-{cls.section} · Roll #{student.roll}
        </Text>
        <Pill
          label={`Grade: ${student.grade}`}
          color={cls.color}
          backgroundColor="rgba(255,255,255,0.9)"
          style={styles.gradePill}
        />
      </LinearGradient>

      <View style={styles.body}>
        {/* Attendance Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Card style={styles.attCard}>
            <View style={styles.attCardContent}>
              <View>
                <Text style={styles.cardTitle}>Attendance</Text>
                <Text style={styles.attPct}>{student.attendance}%</Text>
                <Text style={styles.attDesc}>
                  {student.attendance >= 90
                    ? 'Excellent'
                    : student.attendance >= 75
                      ? 'Average'
                      : 'Poor'}
                </Text>
              </View>
              <Donut
                percentage={student.attendance}
                size={90}
                strokeWidth={9}
                color={
                  student.attendance >= 90
                    ? Colors.present
                    : student.attendance >= 75
                      ? Colors.late
                      : Colors.absent
                }
                backgroundColor={Colors.ruleSoft}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Contact */}
        <Animated.View entering={FadeInDown.delay(160).springify()}>
          <Text style={styles.sectionTitle}>Parent / Guardian</Text>
          <Card padding={0}>
            {[
              { icon: 'person-outline', label: 'Name', value: student.parent },
              { icon: 'call-outline', label: 'Phone', value: student.parentPhone },
            ].map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as never} size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* Academic Info */}
        <Animated.View entering={FadeInDown.delay(220).springify()}>
          <Text style={styles.sectionTitle}>Academic Info</Text>
          <Card padding={0}>
            {[
              { icon: 'school-outline', label: 'Class', value: `${cls.name}-${cls.section}` },
              { icon: 'book-outline', label: 'Subject', value: cls.subject },
              { icon: 'ribbon-outline', label: 'Current Grade', value: student.grade },
              { icon: 'stats-chart-outline', label: 'Attendance', value: `${student.attendance}%` },
            ].map((item) => (
              <View key={item.label} style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon as never} size={18} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </View>
              </View>
            ))}
          </Card>
        </Animated.View>
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
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.white,
    marginTop: 12,
  },
  heroRole: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    marginBottom: 12,
  },
  gradePill: {
    marginTop: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 20,
  },
  attCard: {},
  attCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 6,
  },
  attPct: {
    fontFamily: FontFamily.extraBold,
    fontSize: 36,
    color: Colors.ink,
  },
  attDesc: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ruleSoft,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.sm,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  infoValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.ink,
    marginTop: 1,
  },
});
