import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOpenChat } from '@/features/chat/hooks';
import { navigateToChatThread } from '@/lib/navigateToChat';

type ChatTarget = { name: string; role: string; childId?: string };

export function useStudentChatActions() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const openChat = useOpenChat();
  const inboxTab = session?.user.role === 'principal' ? 'PInbox' : 'Inbox';

  const openChatWith = useCallback(
    ({ name, role, childId }: ChatTarget) => {
      openChat.mutate(
        { name, role, childId },
        {
          onSuccess: (thread) => navigateToChatThread(navigation, thread.id, inboxTab),
        }
      );
    },
    [inboxTab, navigation, openChat]
  );

  const openStudentChat = useCallback(
    (name: string, childId?: string) => openChatWith({ name, role: 'Student', childId }),
    [openChatWith]
  );

  const openParentChat = useCallback(
    (parentName: string, childId?: string) =>
      openChatWith({ name: parentName, role: 'Parent', childId }),
    [openChatWith]
  );

  const isOpening = (name: string, childId?: string) =>
    openChat.isPending &&
    openChat.variables?.name === name &&
    (childId == null || openChat.variables?.childId === childId);

  return {
    openStudentChat,
    openParentChat,
    isOpening,
    isPending: openChat.isPending,
  };
}
