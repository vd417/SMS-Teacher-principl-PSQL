import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme';
import { CallActionButton } from '@/components/contact/CallActionButton';
import { useStudentChatActions } from '@/features/students/useStudentChatActions';

export interface StudentListContactActionsProps {
  studentId?: string;
  studentName: string;
  parentName?: string | null;
  parentPhone?: string | null;
}

/** Chat + call shortcuts per student row (teacher + principal class lists). */
export const StudentListContactActions: React.FC<StudentListContactActionsProps> = ({
  studentId,
  studentName,
  parentName,
  parentPhone,
}) => {
  const { openStudentChat, openParentChat, isOpening } = useStudentChatActions();
  const parent = parentName?.trim();

  return (
    <View style={styles.row}>
      <CallActionButton
        phone={parentPhone}
        name={parent ? `parent of ${studentName}` : studentName}
      />
      <TouchableOpacity
        style={styles.btn}
        onPress={() => openStudentChat(studentName, studentId)}
        disabled={isOpening(studentName, studentId)}
        accessibilityLabel={`Chat with ${studentName}`}
      >
        {isOpening(studentName) ? (
          <ActivityIndicator size="small" color={Colors.primary} />
        ) : (
          <Ionicons name="chatbubble-outline" size={17} color={Colors.primary} />
        )}
      </TouchableOpacity>
      {parent ? (
        <TouchableOpacity
          style={styles.btn}
          onPress={() => openParentChat(parent, studentId)}
          disabled={isOpening(parent, studentId)}
          accessibilityLabel={`Chat with parent ${parent}`}
        >
          {isOpening(parent) ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="people-outline" size={17} color={Colors.primary} />
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/** @deprecated Use StudentListContactActions */
export const StudentListChatActions = StudentListContactActions;

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
