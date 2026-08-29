import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';

export interface StudentSearchMatchRowProps {
  name: string;
  initials: string;
  contextLabel: string;
  roll?: string;
  onPress: () => void;
}

export const StudentSearchMatchRow: React.FC<StudentSearchMatchRowProps> = ({
  name,
  initials,
  contextLabel,
  roll,
  onPress,
}) => (
  <TouchableOpacity style={styles.row} activeOpacity={0.88} onPress={onPress}>
    <View style={styles.icon}>
      <Text style={styles.initials}>{initials}</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.name}>{name}</Text>
      <Text style={styles.meta}>
        {contextLabel}
        {roll ? ` · Roll ${roll}` : ''}
      </Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  name: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  meta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
});
