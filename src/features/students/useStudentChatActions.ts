import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOpenChat } from '@/features/chat/hooks';
import { navigateToChatThread } from '@/lib/navigateToChat';

type ChatTarget = { name: string; role: string };

export function useStudentChatActions() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const openChat = useOpenChat();
  const inboxTab = session?.user.role === 'principal' ? 'PInbox' : 'Inbox';

  const openChatWith = useCallback(
    ({ name, role }: ChatTarget) => {
      openChat.mutate(
        { name, role },
        {
          onSuccess: (thread) => navigateToChatThread(navigation, thread.id, inboxTab),
        }
      );
    },
    [inboxTab, navigation, openChat]
  );

  const openStudentChat = useCallback(
    (name: string) => openChatWith({ name, role: 'Student' }),
    [openChatWith]
  );

  const openParentChat = useCallback(
    (parentName: string) => openChatWith({ name: parentName, role: 'Parent' }),
    [openChatWith]
  );

  const isOpening = (name: string) => openChat.isPending && openChat.variables?.name === name;

  return {
    openStudentChat,
    openParentChat,
    isOpening,
    isPending: openChat.isPending,
  };
}
