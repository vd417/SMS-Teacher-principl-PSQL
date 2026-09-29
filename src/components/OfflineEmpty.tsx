import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme';
import { FontFamily } from '@/theme/typography';

const DEFAULT_BODY =
  "This information hasn't been downloaded to this device yet. Connect to the internet and try again.";

export const OfflineEmpty: React.FC<{ message?: string }> = ({ message }) => (
  <View style={styles.wrap}>
    {message ? null : <Text style={styles.title}>{"You're offline"}</Text>}
    <Text style={styles.body}>{message ?? DEFAULT_BODY}</Text>
  </View>
);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: 6 },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    textAlign: 'center',
  },
});
