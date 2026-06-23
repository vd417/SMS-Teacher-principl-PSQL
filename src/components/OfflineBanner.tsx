import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors } from '@/theme';

export const OfflineBanner: React.FC = () => {
  const [offline, setOffline] = useState(false);
  useEffect(() => NetInfo.addEventListener((s) => setOffline(s.isConnected === false)), []);
  if (!offline) return null;
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: { backgroundColor: Colors.absent, paddingVertical: 6, alignItems: 'center' },
  text: { color: Colors.white, fontSize: 12, fontWeight: '600' },
});
