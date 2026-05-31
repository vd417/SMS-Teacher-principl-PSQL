import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/theme';

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <View style={styles.wrap}>
    <Text style={styles.msg}>{message ?? 'Something went wrong.'}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.btn} onPress={onRetry}>
        <Text style={styles.btnText}>Retry</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  wrap: { padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  msg: { color: Colors.inkMuted, fontSize: 14, textAlign: 'center' },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  btnText: { color: Colors.white, fontWeight: '600' },
});
