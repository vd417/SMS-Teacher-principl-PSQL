import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { useConnectivity } from '@/lib/connectivity';
import { formatLastSynced } from '@/lib/lastSynced';

export const SyncStatus: React.FC<{ updatedAt?: number }> = ({ updatedAt }) => {
  const { status } = useConnectivity();
  const text =
    status === 'offline'
      ? `Offline • ${formatLastSynced(updatedAt, Date.now())}`
      : status === 'reconnecting'
        ? 'Reconnecting…'
        : `Updated ${formatLastSynced(updatedAt, Date.now())}`;
  return <Text style={styles.text}>{text}</Text>;
};

const styles = StyleSheet.create({
  text: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.inkMuted, marginBottom: 8 },
});
