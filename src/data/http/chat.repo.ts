import type { ChatRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toChatContact, toChatMessage, chatContactSchema, chatMessageSchema } from './mappers';

export function httpChat(http: HttpClient): ChatRepository {
  return {
    contacts: () =>
      http
        .get<unknown[]>('/threads')
        .then((d) => d.map((x) => toChatContact(chatContactSchema.parse(x)))),

    messages: (contactId) =>
      http
        .get<unknown[]>(`/threads/${contactId}/messages`)
        .then((d) => d.map((x) => toChatMessage(chatMessageSchema.parse(x)))),

    send: (contactId, text) =>
      http
        .post(`/threads/${contactId}/messages`, { text })
        .then((x) => toChatMessage(chatMessageSchema.parse(x))),
  };
}
