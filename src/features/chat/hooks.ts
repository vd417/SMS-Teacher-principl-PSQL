import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/data/repositories/RepositoryContext';
import { useTenantId } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/queryClient';
import type { ChatMessage } from '@/data/domain';

export function useChatContacts() {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.chatContacts(tenantId),
    queryFn: () => repos.chat.contacts(),
  });
}

export function useChatMessages(contactId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  return useQuery({
    queryKey: queryKeys.chatMessages(tenantId, contactId),
    queryFn: () => repos.chat.messages(contactId),
    enabled: contactId !== '',
  });
}

export function useSendMessage(contactId: string) {
  const repos = useRepositories();
  const tenantId = useTenantId();
  const qc = useQueryClient();
  const key = queryKeys.chatMessages(tenantId, contactId);

  return useMutation({
    mutationFn: (text: string) => repos.chat.send(contactId, text),
    onMutate: async (text) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<ChatMessage[]>(key);
      const optimistic: ChatMessage = {
        id: `temp_${Date.now()}`,
        senderId: 'me',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
      };
      qc.setQueryData<ChatMessage[]>(key, (old) => [...(old ?? []), optimistic]);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}
