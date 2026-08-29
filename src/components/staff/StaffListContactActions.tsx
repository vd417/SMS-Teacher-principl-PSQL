import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme';
import { CallActionButton } from '@/components/contact/CallActionButton';
import { useStaffChatActions } from '@/features/staff/useStaffChatActions';

export interface StaffListContactActionsProps {
  name: string;
  roleLabel: string;
  phone?: string | null;
}

/** Call + chat shortcuts for staff rows (teacher directory). */
export const StaffListContactActions: React.FC<StaffListContactActionsProps> = ({
  name,
  roleLabel,
  phone,
}) => {
  const { openStaffChat, isOpening } = useStaffChatActions();

  return (
    <View style={styles.row}>
      <CallActionButton phone={phone} name={name} />
      <TouchableOpacity
        style={styles.btn}
        onPress={() => openStaffChat(name, roleLabel)}
        disabled={isOpening(name)}
        accessibilityLabel={`Chat with ${name}`}
      >
        {isOpening(name) ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chatbubble-outline" size={17} color={Colors.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
