import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { Colors } from '@/theme';

export const Skeleton: React.FC<{
  height?: number;
  width?: DimensionValue;
  radius?: number;
}> = ({ height = 16, width = '100%', radius = 8 }) => (
  <View style={[styles.base, { height, width, borderRadius: radius }]} />
);

const styles = StyleSheet.create({
  base: { backgroundColor: Colors.rule, opacity: 0.6, marginVertical: 6 },
});
