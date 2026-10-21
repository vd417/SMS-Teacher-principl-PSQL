import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, ScreenHeader, SearchField } from '../components';
import { StaffListContactActions } from '@/components/staff/StaffListContactActions';
import { useSchoolStaffDirectory } from '@/features/staff/hooks';
import { useSchoolTeachers } from '@/features/teachers/hooks';
import { useClasses } from '@/features/classes/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { staffCheckInStatus } from '@/lib/staffCheckIn';
import { homeroomPlaces, teacherListMeta } from '@/lib/teacherListLabel';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';

export const StaffDirectoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const [search, setSearch] = useState('');
  const { members, isLoading, isError, refetch } = useSchoolStaffDirectory();
  const { data: teachers = [] } = useSchoolTeachers();
  const { data: classes = [] } = useClasses();

  const teacherIds = useMemo(() => new Set(teachers.map((t) => t.id)), [teachers]);
  const teacherById = useMemo(
    () => new Map(teachers.map((teacher) => [teacher.id, teacher])),
    [teachers]
  );

  const roleLine = (
    memberId: string,
    roleLabel: string,
    fallback: string,
    classTeacher?: string
  ) => {
    const teacher = teacherById.get(memberId);
    const places = homeroomPlaces(memberId, teacher?.classTeacher ?? classTeacher, classes);
    if (places.length === 0) return fallback;
    return teacherListMeta(roleLabel || fallback, places);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const line = roleLine(m.id, m.roleLabel, m.subtitle, m.classTeacher);
      return (
        m.name.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.roleLabel.toLowerCase().includes(q) ||
        line.toLowerCase().includes(q)
      );
    });
  }, [members, search, teacherById, classes]);

  const openTeacherAcademics = (teacherId: string, teacherName: string) => {
    navigation.navigate('TeacherAcademicsScreen', { teacherId, teacherName });
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ScreenHeader
            title={isPrincipal ? 'Teachers & staff' : 'Staff'}
            subtitle={
              isPrincipal
                ? `${members.length} colleagues · tap a teacher for homework & tests`
                : `${members.length} colleagues`
            }
            showBack
          />
        </View>

        <View style={styles.searchWrap}>
          <SearchField value={search} onChangeText={setSearch} placeholder="Search staff…" />
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 32 }} />
        ) : isError ? (
          <ErrorState message="Could not load staff list." onRetry={() => void refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState label="No staff found" />
        ) : (
          filtered.map((member, i) => {
            const status =
              member.checkedIn === undefined
                ? null
                : staffCheckInStatus({
                    checkedIn: member.checkedIn,
                    checkInAt: member.checkInAt,
                    checkOutAt: member.checkOutAt,
                    checkInVerified: member.checkInVerified,
                  });
            const isTeacher = teacherIds.has(member.id);
            const identity = (
              <>
                <Avatar initials={member.initials} size={42} photoUri={member.photoUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.meta}>
                    {roleLine(member.id, member.roleLabel, member.subtitle, member.classTeacher)}
                  </Text>
                </View>
                {status ? (
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: member.checkedIn
                          ? status.flagged
                            ? Colors.late
                            : Colors.present
                          : Colors.absent,
                      },
                    ]}
                  />
                ) : null}
                {isPrincipal && isTeacher ? (
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkMuted} />
                ) : null}
              </>
            );
            return (
              <Animated.View
                key={member.id}
                entering={FadeInDown.delay(50 * i).springify()}
                style={styles.row}
              >
                <View style={styles.rowMain}>
                  {isPrincipal && isTeacher ? (
                    <TouchableOpacity
                      style={styles.rowTap}
                      onPress={() => openTeacherAcademics(member.id, member.name)}
                      activeOpacity={0.85}
                    >
                      {identity}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.rowTap}>{identity}</View>
                  )}
                  <StaffListContactActions
                    name={member.name}
                    roleLabel={member.roleLabel}
                    phone={member.phone}
                  />
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 12 },
  searchWrap: { marginBottom: 14 },
  row: {
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    marginBottom: 10,
    ...Shadows.card,
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 14,
    paddingVertical: 8,
  },
  rowTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 14,
    paddingVertical: 6,
  },
  name: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
});
