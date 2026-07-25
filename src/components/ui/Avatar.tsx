import React, { useState } from 'react';
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
  // Tracks the last photoUri that failed to load, so a dead/corrupt image falls
  // back to initials instead of an empty tinted circle. Reset automatically when
  // photoUri changes (e.g. the user picks a new photo) since erroredUri no longer
  // matches it.
  const [erroredUri, setErroredUri] = useState<string | null>(null);
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

  if (photoUri && photoUri !== erroredUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={[containerStyle, styles.photo]}
        onError={() => setErroredUri(photoUri)}
        testID="avatar-photo"
        accessibilityLabel="Profile photo"
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
