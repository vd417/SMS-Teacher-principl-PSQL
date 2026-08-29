import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ImageStyle, Platform, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { initialsFrom } from '@/data/http/auth.schema';

const GLASS_SIZE = 60;
const GLASS_RADIUS = 18;
const GLASS_PAD = 12;

interface SchoolLogoProps {
  name: string;
  logoUrl?: string | null;
  size?: number;
  style?: ImageStyle;
  testID?: string;
  /** `glass` = premium home-header card; `light` = school picker / lists. */
  variant?: 'light' | 'glass';
}

function firstLetter(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}

const webGlassBlur: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      } as ViewStyle)
    : {};

/** School crest — light tile or premium glass card on the home gradient. */
export const SchoolLogo: React.FC<SchoolLogoProps> = ({
  name,
  logoUrl,
  size = 48,
  style,
  testID,
  variant = 'light',
}) => {
  const [errored, setErrored] = useState(false);
  const showImage = logoUrl && !errored;
  const isGlass = variant === 'glass';

  if (isGlass) {
    const inner = GLASS_SIZE - GLASS_PAD * 2;

    return (
      <View style={styles.glassFloat}>
        <View style={[styles.glassCard, webGlassBlur]} testID={testID ?? 'school-logo-glass'}>
          {showImage ? (
            <Image
              source={{ uri: logoUrl }}
              style={{ width: inner, height: inner }}
              resizeMode="contain"
              onError={() => setErrored(true)}
              testID="school-logo-image"
              accessibilityLabel={`${name} logo`}
            />
          ) : (
            <View
              style={[styles.glassLetterCircle, { width: inner, height: inner }]}
              testID="school-logo-fallback"
              accessibilityLabel={`${name} logo`}
            >
              <Text style={styles.glassLetter}>{firstLetter(name)}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  const radius = Math.max(14, size * 0.22);
  const pad = Math.max(5, Math.floor(size * 0.12));

  if (showImage) {
    return (
      <View
        style={[
          styles.frameLight,
          { width: size, height: size, borderRadius: radius, padding: pad },
          style,
        ]}
      >
        <Image
          source={{ uri: logoUrl }}
          style={styles.image}
          onError={() => setErrored(true)}
          testID={testID ?? 'school-logo-image'}
          accessibilityLabel={`${name} logo`}
        />
      </View>
    );
  }

  const initials = initialsFrom(name);
  const fontSize = Math.max(11, Math.floor(size * 0.32));

  return (
    <View
      style={[styles.fallbackLight, { width: size, height: size, borderRadius: radius }, style]}
      testID={testID ?? 'school-logo-fallback'}
      accessibilityLabel={`${name} logo`}
    >
      {initials.length <= 2 ? (
        <Text style={[styles.initialsLight, { fontSize }]}>{initials}</Text>
      ) : (
        <Ionicons name="school" size={Math.floor(size * 0.46)} color={Colors.primary} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  glassFloat: {
    transform: [{ translateY: -2 }],
    shadowColor: '#0D0014',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  glassCard: {
    width: GLASS_SIZE,
    height: GLASS_SIZE,
    borderRadius: GLASS_RADIUS,
    padding: GLASS_PAD,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassLetterCircle: {
    borderRadius: 999,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassLetter: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.primary,
  },
  frameLight: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  fallbackLight: {
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primarySoft2,
  },
  initialsLight: {
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
});
