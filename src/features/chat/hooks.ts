import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { useLive } from '@/providers/LiveProvider';
import { queryKeys } from '@/lib/queryClient';
import { assertChatMessageAllowed, assertChatImageAllowed } from '@/lib/chatModeration';
import { findExistingThread } from '@/lib/chatThread';
import type { ChatContact, ChatMessage } from '@/data/domain';
import type { ChatSendInput } from '@/data/repositories/types';

export function useChatContacts() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { connected } = useLive();
  return useQuery({
    queryKey: queryKeys.chatContacts(tenantId),
    queryFn: () => repos.chat.contacts(),
    refetchInterval: connected ? false : 8_000,
  });
}

/** Find an existing thread by contact name or create one, then navigate via callback. */
export function useOpenChat() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      role,
      childId,
    }: {
      name: string;
      role?: string;
      childId?: string;
    }) => {
      const contacts = await repos.chat.contacts();
      const existing = findExistingThread(contacts, { name, role, childId });
      if (existing) return existing;
      return repos.chat.createThread({ name, role, childId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chatContacts(tenantId) });
    },
  });
}

export function useChatMessages(contactId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const { connected } = useLive();
  return useQuery({
    queryKey: queryKeys.chatMessages(tenantId, contactId),
    queryFn: () => repos.chat.messages(contactId),
    enabled: contactId !== '',
    refetchInterval: connected ? false : 4_000,
  });
}

export function useSendMessage(contactId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.chatMessages(tenantId, contactId);

  return useMutation({
    mutationFn: (input: ChatSendInput) => {
      const text = input.text?.trim() ?? '';
      const imageUrl = input.imageUrl?.trim();
      if (text) assertChatMessageAllowed(text);
      if (imageUrl) assertChatImageAllowed(imageUrl);
      return repos.chat.send(contactId, { text: text || undefined, imageUrl });
    },
    onMutate: async (input) => {
      const text = input.text?.trim() ?? '';
      const imageUrl = input.imageUrl?.trim();
      if (text) assertChatMessageAllowed(text);
      if (imageUrl) assertChatImageAllowed(imageUrl);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ChatMessage[]>(key);
      const optimistic: ChatMessage = {
        id: `temp_${Date.now()}`,
        senderId: 'me',
        text,
        imageUrl,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        status: 'sent',
      };
      qc.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: queryKeys.chatContacts(tenantId) });
    },
  });
}
