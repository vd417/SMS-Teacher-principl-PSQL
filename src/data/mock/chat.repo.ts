import type { ChatRepository } from '@/data/repositories/types';
import type { Store } from './store';
import { simulateLatency } from '@/lib/latency';

export function mockChat(store: Store): ChatRepository {
  return {
    async contacts() {
      await simulateLatency();
      return [...store.tables.chatContacts];
    },

    async messages(contactId) {
      await simulateLatency();
      return [...(store.tables.chatMessages[contactId] ?? [])];
    },

    async send(contactId, text) {
      await simulateLatency();
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg = {
        id: store.genId('msg'),
        senderId: 'me',
        text,
        time,
        isMe: true,
      };
      if (!store.tables.chatMessages[contactId]) {
        store.tables.chatMessages[contactId] = [];
      }
      store.tables.chatMessages[contactId].push(msg);
      await store.persist('chatMessages');
      return msg;
    },
  };
}
