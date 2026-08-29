import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Pill } from './ui/Pill';
import { useFeature } from '@/features/plan/hooks';
import { TIER_META } from '@/lib/gating';

interface TierGateProps {
  feature: string;
  title?: string;
  blurb?: string;
  minHeight?: number;
  children: React.ReactNode;
}

/** Blurs and blocks children when the school's plan does not include `feature`. */
export const TierGate: React.FC<TierGateProps> = ({
  feature,
  title,
  blurb,
  minHeight = 200,
  children,
}) => {
  const { allowed, requiredTier: need } = useFeature(feature);
  if (allowed) return <>{children}</>;

  const meta = TIER_META[need];

  return (
    <View style={[styles.wrap, { minHeight }]}>
      <View style={styles.blur} pointerEvents="none">
        {children}
      </View>
      <View style={styles.veil}>
        <View style={styles.card}>
          <View style={[styles.lockIcon, { backgroundColor: meta.backgroundColor }]}>
            <Ionicons name="lock-closed" size={22} color={meta.color} />
          </View>
          <Pill label={meta.label} color={meta.color} backgroundColor={meta.backgroundColor} />
          <Text style={styles.title}>{title ?? 'Feature locked'}</Text>
          <Text style={styles.blurb}>
            {blurb ??
              `This capability is part of the ${meta.label} plan. Contact your school admin to upgrade.`}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  blur: { opacity: 0.25 },
  veil: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
    width: '100%',
    ...Shadows.card,
  },
  lockIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.ink,
    textAlign: 'center',
  },
  blurb: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
