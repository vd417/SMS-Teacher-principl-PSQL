import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface PillProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const Pill: React.FC<PillProps> = ({
  label,
  color = Colors.primary,
  backgroundColor = Colors.primarySoft,
  size = 'md',
  style,
}) => {
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor,
          paddingHorizontal: size === 'sm' ? 8 : 12,
          paddingVertical: size === 'sm' ? 3 : 5,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color,
            fontSize: size === 'sm' ? 10 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    borderRadius: Radii.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: FontFamily.semiBold,
    letterSpacing: 0.3,
  },
});
