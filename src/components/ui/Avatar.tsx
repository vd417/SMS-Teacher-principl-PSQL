import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface AvatarProps {
  initials: string;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  size = 44,
  backgroundColor = Colors.primary,
  textColor = Colors.white,
  fontSize,
}) => {
  const computedFontSize = fontSize ?? Math.floor(size * 0.36);
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor, fontSize: computedFontSize }]}>
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.full,
  },
  text: {
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
});
