import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOpenChat } from '@/features/chat/hooks';
import { navigateToChatThread } from '@/lib/navigateToChat';

export function useStaffChatActions() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const openChat = useOpenChat();
  const inboxTab = session?.user.role === 'principal' ? 'PInbox' : 'Inbox';

  const openStaffChat = useCallback(
    (name: string, roleLabel: string) => {
      const selfName = session?.user.name?.trim().toLowerCase();
      if (selfName && name.trim().toLowerCase() === selfName) return;
      openChat.mutate(
        { name, role: roleLabel },
        {
          onSuccess: (thread) => navigateToChatThread(navigation, thread.id, inboxTab),
        }
      );
    },
    [inboxTab, navigation, openChat, session?.user.name]
  );

  const isOpening = (name: string) => openChat.isPending && openChat.variables?.name === name;

  return { openStaffChat, isOpening, isPending: openChat.isPending };
}
