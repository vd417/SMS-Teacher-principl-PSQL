import React from 'react';

import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import Animated, { FadeInUp } from 'react-native-reanimated';

import { Colors, Radii, Shadows } from '../../theme';

import { FontFamily } from '../../theme/typography';

import { AttendanceSectionTile } from '../attendance/AttendanceSectionTile';

import { gradeLabel } from '../../lib/classLabel';

import { sortBySection } from '../../lib/gradeSort';

export interface SectionOption {
  /** classId to open attendance for */

  id: string;

  /** section label, e.g. "A" */

  section: string;

  /** small line under the label, e.g. "32 students" or "88%" */

  subtitle?: string;
}

interface SectionPickerModalProps {
  visible: boolean;

  gradeName: string | null;

  sections: SectionOption[];

  onSelect: (id: string) => void;

  onClose: () => void;
}

export const SectionPickerModal: React.FC<SectionPickerModalProps> = ({
  visible,

  gradeName,

  sections,

  onSelect,

  onClose,
}) => {
  const sortedSections = sortBySection(sections, (s) => s.section);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.title}>
                  {gradeName ? gradeLabel(gradeName) : 'Select section'}
                </Text>

                <Text style={styles.subtitle}>Choose a section</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color={Colors.inkMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {sortedSections.map((s) => (
                <View key={s.id} style={styles.optionWrap}>
                  <AttendanceSectionTile
                    gradeName={gradeName ?? ''}
                    section={s.section}
                    subtitle={s.subtitle}
                    onPress={() => onSelect(s.id)}
                  />
                </View>
              ))}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,

    backgroundColor: 'rgba(0,0,0,0.45)',

    justifyContent: 'center',

    paddingHorizontal: 24,
  },

  sheet: {
    backgroundColor: Colors.card,

    borderRadius: Radii.xl,

    padding: 20,

    ...Shadows.pop,
  },

  sheetHeader: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',

    marginBottom: 16,
  },

  title: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },

  subtitle: {
    fontFamily: FontFamily.regular,

    fontSize: 13,

    color: Colors.inkMuted,

    marginTop: 2,
  },

  closeBtn: {
    width: 32,

    height: 32,

    borderRadius: Radii.full,

    backgroundColor: Colors.paper2,

    alignItems: 'center',

    justifyContent: 'center',
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  optionWrap: { flexGrow: 1, flexBasis: '44%' },
});
