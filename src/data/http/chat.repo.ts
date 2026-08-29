import type { ChatRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { assertChatMessageAllowed, assertChatImageAllowed } from '@/lib/chatModeration';
import { toChatContact, toChatMessage, chatContactSchema, chatMessageSchema } from './mappers';

function asList(raw: unknown): unknown[] {
  return Array.isArray(raw) ? raw : [];
}

export function httpChat(http: HttpClient): ChatRepository {
  return {
    contacts: () =>
      http
        .get<unknown>('/threads')
        .then((raw) => asList(raw).map((x) => toChatContact(chatContactSchema.parse(x)))),

    messages: (contactId) =>
      http
        .get<unknown>(`/threads/${contactId}/messages`)
        .then((raw) => asList(raw).map((x) => toChatMessage(chatMessageSchema.parse(x)))),

    send: (contactId, input) => {
      const text = input.text?.trim() ?? '';
      const imageUrl = input.imageUrl?.trim() || undefined;
      if (text) assertChatMessageAllowed(text);
      if (imageUrl) assertChatImageAllowed(imageUrl);
      if (!text && !imageUrl) {
        throw new Error('message text or image is required');
      }
      return http
        .post(`/threads/${contactId}/messages`, {
          text: text || null,
          image_url: imageUrl ?? null,
        })
        .then((x) => toChatMessage(chatMessageSchema.parse(x)));
    },

    createThread: ({ name, role }) =>
      http
        .post('/threads', { name, role: role ?? null, group: false, child_id: null })
        .then((x) => toChatContact(chatContactSchema.parse(x))),
  };
}
