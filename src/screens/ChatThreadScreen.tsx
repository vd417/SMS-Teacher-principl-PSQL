import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar } from '../components';
import { useChatContacts, useChatMessages, useSendMessage } from '@/features/chat/hooks';
import { deriveColorSet } from '@/theme/derive';
import { chatMessageSchema, ChatMessageSchemaType } from '../validation/schemas';
import type { ChatMessage } from '@/data/domain';
import type { InboxStackParamList } from '../navigation/types';

type ChatThreadRoute = RouteProp<InboxStackParamList, 'ChatThreadScreen'>;

export const ChatThreadScreen: React.FC = () => {
  const route = useRoute<ChatThreadRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { contactId } = route.params;

  const { data: contacts = [] } = useChatContacts();
  const contact = contacts.find((c) => c.id === contactId);

  const {
    data: messages = [],
    isLoading: messagesLoading,
    isError: messagesError,
  } = useChatMessages(contactId);

  const sendMutation = useSendMessage(contactId);

  const listRef = useRef<FlatList>(null);

  const { control, handleSubmit, reset } = useForm<ChatMessageSchemaType>({
    resolver: zodResolver(chatMessageSchema),
    defaultValues: { message: '' },
  });

  const onSend = (data: ChatMessageSchemaType) => {
    sendMutation.mutate(data.message, {
      onSuccess: () => {
        reset();
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
    });
    reset();
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const { color: avatarColor } = contact ? deriveColorSet(contact.id) : { color: Colors.primary };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 20).springify()}
      style={[styles.msgWrap, item.isMe ? styles.msgWrapMe : styles.msgWrapOther]}
    >
      {!item.isMe && contact && (
        <Avatar initials={contact.initials} size={32} backgroundColor={avatarColor} />
      )}
      <View style={[styles.bubble, item.isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, item.isMe && styles.bubbleTextMe]}>{item.text}</Text>
        <Text style={[styles.bubbleTime, item.isMe && styles.bubbleTimeMe]}>{item.time}</Text>
      </View>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
      keyboardVerticalOffset={insets.bottom}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.ink} />
        </TouchableOpacity>
        {contact ? (
          <Avatar initials={contact.initials} size={40} backgroundColor={avatarColor} />
        ) : (
          <View style={[styles.avatarPlaceholder]} />
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{contact?.name ?? '...'}</Text>
          <Text style={styles.headerRole}>{contact?.role ?? ''}</Text>
        </View>
        {contact?.online && <View style={styles.onlineBadge} />}
      </View>

      {/* Messages */}
      {messagesLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {messagesError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load messages</Text>
        </View>
      )}

      {!messagesLoading && !messagesError && (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          renderItem={renderMessage}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
        <Controller
          control={control}
          name="message"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.messageInput}
              value={value}
              onChangeText={onChange}
              placeholder="Type a message..."
              placeholderTextColor={Colors.inkMuted}
              multiline
              maxLength={500}
            />
          )}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSubmit(onSend)}
          disabled={sendMutation.isPending}
        >
          {sendMutation.isPending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Ionicons name="send" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.rule,
    ...Shadows.card,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.paper2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.paper2,
  },
  headerInfo: { flex: 1, marginLeft: 10 },
  headerName: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  headerRole: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  onlineBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.present,
    marginLeft: 4,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  msgWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '80%',
  },
  msgWrapMe: { alignSelf: 'flex-end' },
  msgWrapOther: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '100%',
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.card,
    borderBottomLeftRadius: 4,
    ...Shadows.card,
  },
  bubbleText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
    lineHeight: 22,
  },
  bubbleTextMe: { color: Colors.white },
  bubbleTime: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.inkMuted,
    marginTop: 4,
    textAlign: 'right',
  },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.6)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.rule,
    gap: 10,
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: Colors.paper2,
    borderRadius: Radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
});
