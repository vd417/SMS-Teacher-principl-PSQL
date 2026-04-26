import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onHide?: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = 'success',
  onHide,
  duration = 3000,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withSpring(1);
      translateY.value = withSpring(0, { damping: 14, stiffness: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });

      if (onHide) {
        opacity.value = withDelay(
          duration,
          withTiming(0, { duration: 300 }, (finished) => {
            if (finished) runOnJS(onHide)();
          })
        );
      }
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(40, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
    }
  }, [visible]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const getColors = () => {
    switch (type) {
      case 'success':
        return { bg: Colors.present, icon: 'checkmark-circle' as const };
      case 'error':
        return { bg: Colors.absent, icon: 'close-circle' as const };
      case 'warning':
        return { bg: Colors.late, icon: 'warning' as const };
      case 'info':
        return { bg: Colors.blue, icon: 'information-circle' as const };
    }
  };

  const { bg, icon } = getColors();

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toast, { backgroundColor: bg }, animStyle]}>
      <Ionicons name={icon} size={20} color={Colors.white} />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    ...Shadows.pop,
    zIndex: 999,
  },
  message: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.white,
    marginLeft: 10,
    flex: 1,
  },
});
