import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { env } from '@/config/env';
import { Colors } from '@/theme';

export const ConfigErrorBanner: React.FC = () => {
  if (!env.configError) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>Can&apos;t reach the server. Please contact support.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.absent, paddingVertical: 6, alignItems: 'center' },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
