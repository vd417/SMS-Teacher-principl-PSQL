import { httpChat } from '../chat.repo';
import { ChatModerationError } from '@/lib/chatModeration';

describe('httpChat.send moderation', () => {
  const post = jest.fn();
  const http = { get: jest.fn(), post } as never;
  const repo = httpChat(http);

  beforeEach(() => {
    post.mockReset();
  });

  it('blocks abusive messages before calling the API', () => {
    expect(() => repo.send('thread-1', { text: 'send me nudes' })).toThrow(ChatModerationError);
    expect(post).not.toHaveBeenCalled();
  });

  it('allows normal school messages through to the API', async () => {
    post.mockResolvedValue({
      id: 'm1',
      sender_id: 'u1',
      text: 'Homework is done',
      sent_at: '2026-07-31T10:00:00Z',
      is_mine: true,
    });

    await repo.send('thread-1', { text: 'Homework is done' });

    expect(post).toHaveBeenCalledWith('/threads/thread-1/messages', {
      text: 'Homework is done',
      image_url: null,
    });
  });
});
