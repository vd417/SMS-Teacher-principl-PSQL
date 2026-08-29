import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { deriveSectionColorSet } from '@/theme/derive';
import { sectionLabel } from '@/lib/classLabel';

export interface AttendanceSectionTileProps {
  gradeName: string;
  section: string;
  subtitle?: string;
  onPress: () => void;
}

export const AttendanceSectionTile: React.FC<AttendanceSectionTileProps> = ({
  gradeName,
  section,
  subtitle,
  onPress,
}) => {
  const cs = deriveSectionColorSet(gradeName);

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: cs.colorTint, borderColor: cs.colorSoft }]}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={[styles.letterCircle, { backgroundColor: cs.color }]}>
        <Text style={styles.sectionLetter}>{section}</Text>
      </View>
      <Text style={[styles.optionLabel, { color: cs.color }]}>{sectionLabel(section)}</Text>
      {subtitle ? <Text style={styles.optionSub}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '44%',
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
    minHeight: 140,
    justifyContent: 'center',
    ...Shadows.card,
  },
  letterCircle: {
    width: 52,
    height: 52,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLetter: {
    fontFamily: FontFamily.extraBold,
    fontSize: 26,
    color: Colors.white,
    lineHeight: 30,
  },
  optionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    textAlign: 'center',
  },
  optionSub: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.inkMuted,
    textAlign: 'center',
  },
});
