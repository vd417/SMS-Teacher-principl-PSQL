import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { deriveColorSet } from '../../theme/derive';
import { Avatar } from './Avatar';

export interface DrawerStaff {
  teacherId: string;
  name: string;
  initials: string;
  subject: string;
  checkedIn: boolean;
  /** Non-teaching role (Security, Guard, Peon); teachers group by subject. */
  role?: string;
}

interface TeacherSubjectDrawerProps {
  visible: boolean;
  staff: DrawerStaff[];
  onClose: () => void;
  title?: string;
}

export const TeacherSubjectDrawer: React.FC<TeacherSubjectDrawerProps> = ({
  visible,
  staff,
  onClose,
  title = 'Staff by department',
}) => {
  const groups = useMemo(() => {
    const map = new Map<string, DrawerStaff[]>();
    for (const t of staff) {
      // Non-teaching staff group by their role; teachers group by subject.
      const key = t.role && t.role.length > 0 ? t.role : t.subject || 'Other';
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return [...map.entries()]
      .map(([subject, teachers]) => ({ subject, teachers }))
      .sort((a, b) => a.subject.localeCompare(b.subject));
  }, [staff]);

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

                  {g.teachers.map((t) => (
                    <View
                      key={t.teacherId}
                      style={[styles.teacherRow, { borderColor: cs.colorSoft }]}
                    >
                      <Avatar initials={t.initials} size={36} backgroundColor={cs.color} />
                      <Text style={styles.teacherName}>{t.name}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: t.checkedIn ? Colors.presentSoft : Colors.paper2 },
                        ]}
                      >
                        <Ionicons
                          name={t.checkedIn ? 'checkmark-circle' : 'ellipse-outline'}
                          size={13}
                          color={t.checkedIn ? Colors.present : Colors.inkMuted}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: t.checkedIn ? Colors.present : Colors.inkMuted },
                          ]}
                        >
                          {t.checkedIn ? 'In' : 'Out'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}
            {groups.length === 0 && <Text style={styles.empty}>No staff found</Text>}
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
  scroll: { flexGrow: 0 },
  group: { marginBottom: 18 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { fontFamily: FontFamily.bold, fontSize: 15, flex: 1 },
  subjectCount: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.inkMuted },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.paper,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
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
