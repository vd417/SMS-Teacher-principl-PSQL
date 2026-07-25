import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface AvatarProps {
  initials: string;
  photoUri?: string | null;
  size?: number;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  photoUri,
  size = 44,
  backgroundColor = Colors.primary,
  textColor = Colors.white,
  fontSize,
}) => {
  const computedFontSize = fontSize ?? Math.floor(size * 0.36);
  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
    },
  ];

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={[containerStyle, styles.photo]}
        testID="avatar-photo"
      />
    );
  }

  return (
    <View style={containerStyle}>
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
  photo: {
    resizeMode: 'cover',
  },
  text: {
    fontFamily: FontFamily.bold,
    letterSpacing: 0.5,
  },
});
