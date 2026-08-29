import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface SchoolClosedBannerProps {
  title: string;
  description?: string;
}

export const SchoolClosedBanner: React.FC<SchoolClosedBannerProps> = ({ title, description }) => (
  <View style={styles.banner}>
    <Ionicons name="calendar-outline" size={18} color={Colors.absent} />
    <View style={styles.content}>
      <Text style={styles.title}>School closed today</Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {title}
      </Text>
      {description ? (
        <Text style={styles.body} numberOfLines={3}>
          {description}
        </Text>
      ) : null}
    </View>
  </View>
);

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.absentSoft,
    borderRadius: Radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  content: { flex: 1 },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.absent,
  },
  subtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.ink,
    marginTop: 2,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 4,
    lineHeight: 17,
  },
});
