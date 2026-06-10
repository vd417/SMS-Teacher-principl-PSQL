import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { deriveColorSet } from '../../theme/derive';

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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View entering={FadeInUp.springify().damping(18)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.title}>{gradeName ?? 'Select section'}</Text>
            <Text style={styles.subtitle}>Choose a section</Text>

            <View style={styles.grid}>
              {sections.map((s) => {
                const cs = deriveColorSet(s.id);
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.option,
                      { backgroundColor: cs.colorSoft, borderColor: cs.color },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onSelect(s.id)}
                  >
                    <View style={[styles.badge, { backgroundColor: cs.color }]}>
                      <Text style={styles.badgeText}>{s.section}</Text>
                    </View>
                    <Text style={[styles.optionLabel, { color: cs.color }]}>
                      Section {s.section}
                    </Text>
                    {s.subtitle ? <Text style={styles.optionSub}>{s.subtitle}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={18} color={Colors.inkMuted} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
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
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.ruleSoft,
    marginBottom: 14,
  },
  title: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  option: {
    flexGrow: 1,
    flexBasis: '44%',
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: FontFamily.extraBold, fontSize: 18, color: Colors.white },
  optionLabel: { fontFamily: FontFamily.bold, fontSize: 15 },
  optionSub: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  cancel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
    paddingVertical: 12,
    borderRadius: Radii.full,
    backgroundColor: Colors.paper2,
  },
  cancelText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.inkMuted },
});
