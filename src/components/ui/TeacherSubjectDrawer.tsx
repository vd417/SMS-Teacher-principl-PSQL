import React, { useMemo, useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { deriveColorSet } from '../../theme/derive';
import { Avatar } from './Avatar';
import { filterStaffBySearch } from '@/lib/staffSearch';
import { staffCheckInStatus } from '@/lib/staffCheckIn';
import { SearchField } from './SearchField';
import { StaffListContactActions } from '@/components/staff/StaffListContactActions';

export interface DrawerStaff {
  teacherId: string;
  name: string;
  initials: string;
  subject: string;
  phone?: string;
  checkedIn: boolean;
  checkInAt?: string;
  checkOutAt?: string;
  checkInVerified?: boolean;
  /** Teaching title when grouped under subject in the teaching drawer. */
  designation?: string;
  /** Non-teaching role (Security, Guard, Peon); teachers group by subject. */
  role?: string;
}

interface TeacherSubjectDrawerProps {
  visible: boolean;
  staff: DrawerStaff[];
  onClose: () => void;
  title?: string;
  /** Pre-fill drawer search (e.g. when opened from the attendance screen search). */
  initialSearch?: string;
  /** Tap a staff row's name/avatar to view their check-in/out history. */
  onPressTeacher?: (teacher: DrawerStaff) => void;
}

export const TeacherSubjectDrawer: React.FC<TeacherSubjectDrawerProps> = ({
  visible,
  staff,
  onClose,
  title = 'Staff by department',
  initialSearch = '',
  onPressTeacher,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) setSearch(initialSearch);
    else setSearch('');
  }, [visible, initialSearch]);

  const filteredStaff = useMemo(() => filterStaffBySearch(staff, search), [staff, search]);

  const groups = useMemo(() => {
    const map = new Map<string, DrawerStaff[]>();
    for (const t of filteredStaff) {
      // Non-teaching staff group by their role; teachers group by subject.
      const key = t.role && t.role.length > 0 ? t.role : t.subject || t.designation || 'Other';
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([subject, teachers]) => ({ subject, teachers }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [filteredStaff]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.drawer} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={Colors.inkMuted} />
            </Pressable>
          </View>

          <SearchField
            placeholder="Search staff by name..."
            value={search}
            onChangeText={setSearch}
            style={styles.search}
          />

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {groups.map((g) => {
              const cs = deriveColorSet(g.subject);
              const present = g.teachers.filter((t) => t.checkedIn).length;
              return (
                <View key={g.subject} style={styles.group}>
                  <View style={styles.groupHeader}>
                    <View style={[styles.subjectDot, { backgroundColor: cs.color }]} />
                    <Text style={[styles.subjectName, { color: cs.color }]}>{g.subject}</Text>
                    <Text style={styles.subjectCount}>
                      {present}/{g.teachers.length} in
                    </Text>
                  </View>

                  {g.teachers.map((t) => {
                    const status = staffCheckInStatus(t);
                    return (
                      <View
                        key={t.teacherId}
                        style={[styles.teacherRow, { borderColor: cs.colorSoft }]}
                      >
                        <Pressable
                          style={styles.teacherRowTop}
                          disabled={!onPressTeacher}
                          onPress={() => onPressTeacher?.(t)}
                        >
                          <Avatar initials={t.initials} size={36} backgroundColor={cs.color} />
                          <Text style={styles.teacherName} numberOfLines={1}>
                            {t.name}
                          </Text>
                          <View
                            style={[
                              styles.statusPill,
                              {
                                backgroundColor: t.checkedIn
                                  ? status.flagged
                                    ? Colors.lateSoft
                                    : Colors.presentSoft
                                  : Colors.paper2,
                              },
                            ]}
                          >
                            <Ionicons
                              name={
                                t.checkedIn
                                  ? status.flagged
                                    ? 'warning-outline'
                                    : 'checkmark-circle'
                                  : 'ellipse-outline'
                              }
                              size={13}
                              color={
                                t.checkedIn
                                  ? status.flagged
                                    ? Colors.late
                                    : Colors.present
                                  : Colors.inkMuted
                              }
                            />
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color: t.checkedIn
                                    ? status.flagged
                                      ? Colors.late
                                      : Colors.present
                                    : Colors.inkMuted,
                                },
                              ]}
                            >
                              {status.label}
                            </Text>
                          </View>
                        </Pressable>
                        <View style={styles.teacherRowActions}>
                          {onPressTeacher ? (
                            <Pressable
                              style={styles.historyLink}
                              onPress={() => onPressTeacher(t)}
                              accessibilityLabel={`View ${t.name}'s attendance history`}
                            >
                              <Text style={styles.historyLinkText}>History</Text>
                              <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
                            </Pressable>
                          ) : null}
                          <StaffListContactActions
                            name={t.name}
                            roleLabel={t.designation || t.role || t.subject || 'Staff'}
                            phone={t.phone}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            {groups.length === 0 && (
              <Text style={styles.empty}>
                {search.trim() ? 'No matching staff' : 'No staff found'}
              </Text>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  drawer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '78%',
    ...Shadows.pop,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.ruleSoft,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  search: { marginBottom: 12 },
  scroll: { flexGrow: 0 },
  group: { marginBottom: 18 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { fontFamily: FontFamily.bold, fontSize: 15, flex: 1 },
  subjectCount: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.inkMuted },
  teacherRow: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  teacherRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teacherRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingRight: 8,
  },
  historyLinkText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.primary },
  teacherName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink, flex: 1 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  statusText: { fontFamily: FontFamily.bold, fontSize: 12 },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
