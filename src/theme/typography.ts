import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
};

export const Typography = StyleSheet.create({
  displayLg: {
    fontFamily: FontFamily.extraBold,
    fontSize: 32,
    lineHeight: 40,
    color: Colors.ink,
  },
  displayMd: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.ink,
  },
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    color: Colors.ink,
  },
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    color: Colors.ink,
  },
  h3: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    lineHeight: 26,
    color: Colors.ink,
  },
  h4: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.ink,
  },
  bodyLg: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.ink,
  },
  bodyMd: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.ink,
  },
  bodySm: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.inkMuted,
  },
  labelLg: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.ink,
  },
  labelMd: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.ink,
  },
  labelSm: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.inkMuted,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    lineHeight: 16,
    color: Colors.inkMuted,
  },
});
