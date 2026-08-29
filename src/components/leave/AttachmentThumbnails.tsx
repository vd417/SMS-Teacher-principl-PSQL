import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Radii } from '@/theme';

type Props = {
  urls: string[];
  size?: number;
};

export const AttachmentThumbnails: React.FC<Props> = ({ urls, size = 64 }) => {
  if (!urls.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row}>
      {urls.map((url, i) => (
        <View
          key={`${url.slice(0, 24)}-${i}`}
          style={[styles.thumb, { width: size, height: size }]}
        >
          <Image source={{ uri: url }} style={styles.image} resizeMode="cover" />
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { marginTop: 10 },
  thumb: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    marginRight: 8,
  },
  image: { width: '100%', height: '100%' },
});
