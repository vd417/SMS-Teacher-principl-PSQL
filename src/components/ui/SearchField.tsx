import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface SearchFieldProps extends TextInputProps {
  placeholder?: string;
}

export const SearchField: React.FC<SearchFieldProps> = ({
  placeholder = 'Search...',
  ...props
}) => {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={Colors.inkMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.inkMuted}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...Shadows.card,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.ink,
    padding: 0,
  },
});
