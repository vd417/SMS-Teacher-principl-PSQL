import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { FontFamily } from '../../theme/typography';

interface NotificationBellProps {
  unreadCount: number;
  onPress: () => void;
  /** Sits on the gradient home header — light icon, dark badge ring. */
  onDark?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onPress,
  onDark = false,
}) => {
  const iconColor = onDark ? Colors.white : Colors.ink;
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={hasUnread ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="notifications-outline" size={22} color={iconColor} />
      {hasUnread && (
        <View style={[styles.badge, { borderColor: onDark ? Colors.primaryDeep : Colors.paper }]}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: Colors.absent,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.white,
  },
});
