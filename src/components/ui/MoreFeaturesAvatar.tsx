import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar } from './Avatar';
import { useAuth } from '@/features/auth/AuthProvider';

interface MoreFeaturesAvatarProps {
  size?: number;
  onPress: () => void;
  showLabel?: boolean;
  /** Sits on the gradient home header — light ring + badge. */
  onDark?: boolean;
}

/** User avatar with a grid badge so teachers know more features live behind it. */
export const MoreFeaturesAvatar: React.FC<MoreFeaturesAvatarProps> = ({
  size = 40,
  onPress,
  showLabel = false,
  onDark = false,
}) => {
  const { session } = useAuth();
  const user = session?.user;
  const badgeSize = Math.max(16, Math.round(size * 0.36));
  const ringColor = onDark ? 'rgba(255,255,255,0.28)' : Colors.paper;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel="More features"
      accessibilityHint="Opens library, payslip, leave, chat, and other tools"
    >
      <View style={[styles.ring, { borderColor: ringColor }]}>
        <Avatar
          initials={user?.initials ?? '?'}
          photoUri={user?.photoUrl}
          size={size}
          backgroundColor={onDark ? Colors.primaryBright : Colors.primary}
        />
        <View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              borderColor: onDark ? Colors.primaryDeep : Colors.paper,
            },
          ]}
        >
          <Ionicons name="grid" size={Math.max(9, badgeSize - 7)} color={Colors.white} />
        </View>
      </View>
      {showLabel ? <Text style={[styles.label, onDark && styles.labelOnDark]}>More</Text> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  ring: {
    borderWidth: 2,
    borderRadius: 999,
    padding: 2,
  },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  label: {
    marginTop: 4,
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.primary,
  },
  labelOnDark: {
    color: 'rgba(255,255,255,0.85)',
  },
});
