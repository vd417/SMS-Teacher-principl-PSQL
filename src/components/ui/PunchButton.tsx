import React from 'react';
import { Text, StyleSheet, Pressable, ActivityIndicator, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PunchButtonProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Attractive, animated check-in / check-out action.
 * Brand-gradient fill, a springy press-scale, and a soft "pop" shadow.
 */
export const PunchButton: React.FC<PunchButtonProps> = ({
  label,
  icon = 'enter-outline',
  onPress,
  loading = false,
  disabled = false,
  style,
}) => {
  const isDisabled = disabled || loading;
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  React.useEffect(() => {
    opacity.value = withTiming(isDisabled ? 0.45 : 1, { duration: 180 });
  }, [isDisabled, opacity]);

  const handleIn = () => {
    if (isDisabled) return;
    scale.value = withSpring(0.94, { damping: 15, stiffness: 400 });
  };
  const handleOut = () => {
    scale.value = withSpring(1, { damping: 11, stiffness: 260 });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[styles.wrap, animStyle, style]}
    >
      <LinearGradient
        colors={[Colors.primaryBright, Colors.primary, Colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <>
            <Ionicons name={icon} size={18} color={Colors.white} />
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radii.full,
    ...Shadows.pop,
  },
  gradient: {
    height: 52,
    borderRadius: Radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.white,
  },
});
