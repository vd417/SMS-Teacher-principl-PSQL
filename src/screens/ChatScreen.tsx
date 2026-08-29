import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { Avatar, SearchField, ScreenHeader } from '../components';
import { useChatContacts } from '@/features/chat/hooks';
import { deriveColorSet } from '@/theme/derive';
import type { HomeStackParamList, InboxStackParamList } from '../navigation/types';

type ChatNav = NativeStackNavigationProp<HomeStackParamList & InboxStackParamList, 'ChatScreen'>;

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<ChatNav>();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const { data: chatContacts = [], isLoading, isError } = useChatContacts();

  const filtered = chatContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = chatContacts.reduce((sum, c) => sum + c.unread, 0);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title="Chat"
            subtitle={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
            showBack={navigation.canGoBack()}
          />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchWrap}>
          <SearchField
            placeholder="Search conversations..."
            value={search}
            onChangeText={setSearch}
          />
        </Animated.View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load conversations</Text>
        </View>
      )}

      {!isLoading && !isError && chatContacts.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No conversations yet</Text>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const { color } = deriveColorSet(item.id);
            return (
              <Animated.View entering={FadeInDown.delay(140 + index * 50).springify()}>
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={() => navigation.navigate('ChatThreadScreen', { contactId: item.id })}
                  activeOpacity={0.8}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar initials={item.initials} size={50} backgroundColor={color} />
                    {item.online && <View style={styles.onlineDot} />}
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactTop}>
                      <Text style={[styles.contactName, item.unread > 0 && styles.contactNameBold]}>
                        {item.name}
                      </Text>
                      <Text style={styles.contactTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.contactRole}>
                      {item.role ? item.role : 'Contact'}
                      {item.childName
                        ? ` · ${item.childName}${item.childClassLabel ? ` (${item.childClassLabel})` : ''}`
                        : ''}
                    </Text>
                    <View style={styles.lastMessageRow}>
                      {item.lastMessageMine && item.lastMessageStatus ? (
                        <Ionicons
                          name={item.lastMessageStatus === 'sent' ? 'checkmark' : 'checkmark-done'}
                          size={14}
                          color={item.lastMessageStatus === 'read' ? Colors.blue : Colors.inkMuted}
                          style={styles.tick}
                        />
                      ) : null}
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage || 'No messages yet'}
                      </Text>
                    </View>
                  </View>
                  {item.unread > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  searchWrap: { marginTop: 12 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  errorText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.absent },
  emptyText: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
    marginBottom: 2,
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: Colors.present,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  contactInfo: { flex: 1 },
  contactTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactName: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.ink },
  contactNameBold: { fontFamily: FontFamily.bold },
  contactTime: { fontFamily: FontFamily.regular, fontSize: 12, color: Colors.inkMuted },
  contactRole: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginBottom: 2,
  },
  lastMessageRow: { flexDirection: 'row', alignItems: 'center' },
  tick: { marginRight: 3 },
  lastMessage: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.inkMuted,
    flexShrink: 1,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: { fontFamily: FontFamily.bold, fontSize: 11, color: Colors.white },
  separator: { height: 8 },
});
