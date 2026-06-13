import type { ChatRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toChatContact, toChatMessage, type ChatContactDTO, type ChatMessageDTO } from './mappers';

export function httpChat(http: HttpClient): ChatRepository {
  return {
    contacts: () => http.get<ChatContactDTO[]>('/threads').then((d) => d.map(toChatContact)),

    messages: (contactId) =>
      http
        .get<ChatMessageDTO[]>(`/threads/${contactId}/messages`)
        .then((d) => d.map(toChatMessage)),

    send: (contactId, text) =>
      http.post<ChatMessageDTO>(`/threads/${contactId}/messages`, { text }).then(toChatMessage),
  };
}
