import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';
import { pickImagesFromLibrary } from '@/lib/pickImages';

const MAX = 5;

type Props = {
  urls: string[];
  onChange: (urls: string[]) => void;
};

export const LeaveAttachmentPicker: React.FC<Props> = ({ urls, onChange }) => {
  const add = async () => {
    const picked = await pickImagesFromLibrary(MAX - urls.length);
    if (picked.length) onChange([...urls, ...picked].slice(0, MAX));
  };

  const remove = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Supporting documents (optional)</Text>
      <Text style={styles.hint}>Up to {MAX} photos — medical certificate, etc.</Text>
      <View style={styles.grid}>
        {urls.map((url, i) => (
          <View key={`${i}-${url.slice(0, 16)}`} style={styles.thumbWrap}>
            <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
            <TouchableOpacity
              style={styles.remove}
              onPress={() => remove(i)}
              accessibilityLabel="Remove"
            >
              <Ionicons name="close-circle" size={22} color={Colors.absent} />
            </TouchableOpacity>
          </View>
        ))}
        {urls.length < MAX ? (
          <TouchableOpacity style={styles.add} onPress={add}>
            <Ionicons name="add" size={28} color={Colors.primary} />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  label: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.ink3, marginBottom: 4 },
  hint: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkSoft, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: Radii.md },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.white,
    borderRadius: 11,
  },
  add: {
    width: 72,
    height: 72,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.rule,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  addText: { fontFamily: FontFamily.medium, fontSize: 11, color: Colors.primary, marginTop: 2 },
});
