import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { SchoolLogo } from '../ui/SchoolLogo';

interface HomeSchoolHeaderProps {
  logoUrl: string | null;
  schoolName: string;
  greetingLine: string;
  nameLine: string;
  rightSlot: React.ReactNode;
}

/** Modern home hero — branded gradient strip with school logo. */
export const HomeSchoolHeader: React.FC<HomeSchoolHeaderProps> = ({
  logoUrl,
  schoolName,
  greetingLine,
  nameLine,
  rightSlot,
}) => (
  <LinearGradient
    colors={[Colors.primaryDeep, Colors.primary, Colors.primaryBright]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.card}
  >
    <View style={styles.accent} />
    <View style={styles.row}>
      <SchoolLogo name={schoolName} logoUrl={logoUrl} variant="glass" />
      <View style={styles.body}>
        <Text style={styles.schoolName} numberOfLines={1}>
          {schoolName}
        </Text>
        <Text style={styles.greeting} numberOfLines={1}>
          {greetingLine}
        </Text>
        <Text style={styles.name} numberOfLines={1}>
          {nameLine}
        </Text>
      </View>
      <View style={styles.right}>{rightSlot}</View>
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.lg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Shadows.pop,
  },
  accent: {
    position: 'absolute',
    right: -24,
    top: -24,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  right: {
    alignItems: 'center',
  },
  schoolName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 6,
  },
  greeting: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 2,
  },
  name: {
    fontFamily: FontFamily.extraBold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.3,
  },
});
