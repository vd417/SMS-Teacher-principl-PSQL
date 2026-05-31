import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

export const EmptyState: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.wrap}>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  label: { color: Colors.inkMuted, fontSize: 14 },
});
