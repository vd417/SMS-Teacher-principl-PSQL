import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme';
import { useConnectivity } from '@/lib/connectivity';

export const OfflineBanner: React.FC = () => {
  const { status } = useConnectivity();
  if (status === 'online') return null;
  const offline = status === 'offline';
  return (
    <View style={[styles.bar, !offline && styles.reconnecting]}>
      <Text style={styles.text}>{offline ? 'No internet connection' : 'Reconnecting…'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.absent, paddingVertical: 6, alignItems: 'center' },
  reconnecting: { backgroundColor: Colors.late },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
