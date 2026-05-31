import type { ChatRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toChatContact, toChatMessage, type ChatContactDTO, type ChatMessageDTO } from './mappers';

export function httpChat(http: HttpClient): ChatRepository {
  return {
    contacts: () => http.get<ChatContactDTO[]>('/chats').then((d) => d.map(toChatContact)),

    messages: (contactId) =>
      http.get<ChatMessageDTO[]>(`/chats/${contactId}/messages`).then((d) => d.map(toChatMessage)),

    send: (contactId, text) =>
      http.post<ChatMessageDTO>(`/chats/${contactId}/messages`, { text }).then(toChatMessage),
  };
}
