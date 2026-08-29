import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import {
  CHAT_MODERATION_WARNING,
  ChatModerationError,
  validateChatMessage,
  validateChatImage,
} from '@/lib/chatModeration';
import { useSendMessage } from './hooks';

/** Shared send flow with moderation for every chat thread screen. */
export function useChatComposer(contactId: string) {
  const sendMutation = useSendMessage(contactId);
  const [sendError, setSendError] = useState(false);
  const [moderationError, setModerationError] = useState(false);

  const clearModerationError = useCallback(() => setModerationError(false), []);

  const showModerationAlert = useCallback(() => {
    setModerationError(true);
    Alert.alert('Message blocked', CHAT_MODERATION_WARNING);
  }, []);

  const sendPayload = useCallback(
    (input: { text?: string; imageUrl?: string }, onSuccess?: () => void) => {
      setSendError(false);
      setModerationError(false);
      const text = input.text?.trim() ?? '';
      const imageUrl = input.imageUrl?.trim();
      if (!text && !imageUrl) return;
      if (text && !validateChatMessage(text).ok) {
        showModerationAlert();
        return;
      }
      if (imageUrl && !validateChatImage(imageUrl).ok) {
        showModerationAlert();
        return;
      }
      sendMutation.mutate(
        { text: text || undefined, imageUrl },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => {
            if (err instanceof ChatModerationError) {
              showModerationAlert();
              return;
            }
            setSendError(true);
          },
        }
      );
    },
    [sendMutation, showModerationAlert]
  );

  const sendMessage = useCallback(
    (text: string, onSuccess?: () => void) => sendPayload({ text }, onSuccess),
    [sendPayload]
  );

  const sendImage = useCallback(
    (imageUrl: string, onSuccess?: () => void) => sendPayload({ imageUrl }, onSuccess),
    [sendPayload]
  );

  return {
    sendMessage,
    sendImage,
    sendPending: sendMutation.isPending,
    sendError,
    moderationError,
    moderationWarning: CHAT_MODERATION_WARNING,
    clearModerationError,
  };
}
