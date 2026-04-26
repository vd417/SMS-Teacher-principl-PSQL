import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const getBgColor = () => {
    if (disabled) return Colors.inkSoft;
    switch (variant) {
      case 'primary':
        return Colors.primary;
      case 'secondary':
        return Colors.primarySoft;
      case 'ghost':
        return 'transparent';
      case 'danger':
        return Colors.absent;
    }
  };

  const getTextColor = () => {
    if (disabled) return Colors.inkMuted;
    switch (variant) {
      case 'primary':
        return Colors.white;
      case 'secondary':
        return Colors.primary;
      case 'ghost':
        return Colors.primary;
      case 'danger':
        return Colors.white;
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return 38;
      case 'md':
        return 50;
      case 'lg':
        return 58;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 13;
      case 'md':
        return 15;
      case 'lg':
        return 17;
    }
  };

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: getBgColor(),
          height: getHeight(),
          ...(fullWidth ? { width: '100%' } : {}),
          ...(variant === 'ghost'
            ? {}
            : variant === 'secondary'
              ? {}
              : disabled
                ? {}
                : Shadows.card),
        },
        animatedStyle,
        style,
      ]}
      activeOpacity={0.9}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text
          style={[
            styles.label,
            {
              color: getTextColor(),
              fontSize: getFontSize(),
            },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: FontFamily.bold,
    letterSpacing: 0.3,
  },
});
