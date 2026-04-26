import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radii, Shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  shadow?: 'card' | 'pop' | 'none';
  borderRadius?: number;
  backgroundColor?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 16,
  shadow = 'card',
  borderRadius = Radii.lg,
  backgroundColor = Colors.card,
}) => {
  const shadowStyle = shadow === 'none' ? {} : Shadows[shadow];

  return (
    <View
      style={[
        styles.card,
        shadowStyle,
        {
          padding,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
  },
});
