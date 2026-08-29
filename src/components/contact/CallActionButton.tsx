import React from 'react';
import { Alert, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme';
import { dialPhoneNumber } from '@/lib/phoneLink';

type CallActionButtonProps = {
  phone?: string | null;
  name: string;
  size?: number;
};

/** Phone dialer shortcut — always visible on mobile, hidden on web when no number. */
export const CallActionButton: React.FC<CallActionButtonProps> = ({ phone, name, size = 17 }) => {
  const dial = phone?.trim();
  const showOnWeb = Boolean(dial);
  const showOnMobile = Platform.OS !== 'web';

  if (!showOnWeb && !showOnMobile) return null;

  const onPress = () => {
    if (!dial) {
      Alert.alert('No phone number', `Phone number is not available for ${name}.`);
      return;
    }
    void dialPhoneNumber(dial);
  };

  return (
    <TouchableOpacity
      style={[styles.btn, !dial && styles.btnMuted]}
      onPress={onPress}
      accessibilityLabel={dial ? `Call ${name}` : `No phone number for ${name}`}
    >
      <Ionicons name="call-outline" size={size} color={dial ? Colors.primary : Colors.inkMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMuted: {
    backgroundColor: Colors.paper2,
  },
});
