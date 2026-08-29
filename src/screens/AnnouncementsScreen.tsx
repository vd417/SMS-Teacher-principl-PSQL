import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill } from '../components';
import {
  useAnnouncements,
  useAppNotifications,
  useCreateAnnouncement,
  useMarkNotificationsRead,
} from '@/features/announcements/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';
import { resolveNotificationRoute } from '@/lib/notificationRouting';
import type { AnnouncementType } from '@/data/domain';

const TYPE_CONFIG: Record<AnnouncementType, { color: string; soft: string; icon: string }> = {
  info: { color: Colors.blue, soft: Colors.blueSoft, icon: 'information-circle' },
  warning: { color: Colors.late, soft: Colors.lateSoft, icon: 'warning' },
  event: { color: Colors.present, soft: Colors.presentSoft, icon: 'calendar' },
  urgent: { color: Colors.absent, soft: Colors.absentSoft, icon: 'alert-circle' },
};

export const AnnouncementsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { data: announcements = [], isLoading, isError, refetch } = useAnnouncements();
  const {
    data: appNotifications = [],
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useAppNotifications();
  const markNotificationsRead = useMarkNotificationsRead();

  const pinned = announcements.filter((a) => a.pinned);
  const rest = announcements.filter((a) => !a.pinned);
  const loading = isLoading || notificationsLoading;
  const hasError = isError || notificationsError;
  const retry = () => {
    void refetch();
    void refetchNotifications();
  };

  const { session } = useAuth();
  const isPrincipal = session?.user.role === 'principal';
  const createAnnouncement = useCreateAnnouncement();

  const hasUnread = appNotifications.some((n) => n.unread);
  useFocusEffect(
    useCallback(() => {
      if (hasUnread) markNotificationsRead.mutate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasUnread])
  );

  const handleNotificationPress = (note: { icon: string; title: string }) => {
    const target = resolveNotificationRoute(note, isPrincipal);
    if (!target) return;
    if (target.kind === 'tab') {
      navigation.getParent()?.navigate(target.tab);
    } else {
      navigation.navigate(target.screen, target.params);
    }
  };
  const [composeOpen, setComposeOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const submitAnnouncement = () => {
    if (!draftTitle.trim() || !draftBody.trim()) return;
    createAnnouncement.mutate(
      { title: draftTitle.trim(), body: draftBody.trim(), type: 'info' },
      {
        onSuccess: () => {
          setDraftTitle('');
          setDraftBody('');
          setComposeOpen(false);
        },
      }
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader title="Announcements" subtitle={`${announcements.length} total`} showBack />
        </Animated.View>

        {loading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={90} radius={12} />
            ))}
          </>
        ) : hasError ? (
          <ErrorState onRetry={retry} />
        ) : announcements.length === 0 && appNotifications.length === 0 ? (
          <EmptyState label="No announcements yet" />
        ) : (
          <>
            {appNotifications.length > 0 && (
              <>
                <Animated.View entering={FadeInDown.delay(90).springify()}>
                  <Text style={styles.sectionLabel}>App alerts</Text>
                </Animated.View>
                {appNotifications.map((note, i) => {
                  const target = resolveNotificationRoute(note, isPrincipal);
                  return (
                    <Animated.View
                      key={note.id}
                      entering={FadeInDown.delay(110 + i * 50).springify()}
                    >
                      <TouchableOpacity
                        style={[styles.annCard, note.unread && styles.unreadCard]}
                        activeOpacity={target ? 0.8 : 1}
                        disabled={!target}
                        onPress={() => handleNotificationPress(note)}
                      >
                        <View style={[styles.typeIcon, { backgroundColor: Colors.blueSoft }]}>
                          <Ionicons name="notifications" size={20} color={Colors.blue} />
                        </View>
                        <View style={styles.annContent}>
                          <Text style={styles.annTitle}>{note.title}</Text>
                          {note.body ? (
                            <Text style={styles.annBody} numberOfLines={3}>
                              {note.body}
                            </Text>
                          ) : null}
                          {note.time ? <Text style={styles.annMeta}>{note.time}</Text> : null}
                        </View>
                        {target ? (
                          <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
                        ) : null}
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </>
            )}
            {pinned.length > 0 && (
              <>
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <Text style={styles.sectionLabel}>📌 Pinned</Text>
                </Animated.View>
                {pinned.map((ann, i) => {
                  const cfg = TYPE_CONFIG[ann.type];
                  return (
                    <Animated.View
                      key={ann.id}
                      entering={FadeInDown.delay(130 + i * 50).springify()}
                    >
                      <View style={[styles.annCard, styles.pinnedCard]}>
                        <View style={[styles.typeIcon, { backgroundColor: cfg.soft }]}>
                          <Ionicons name={cfg.icon as never} size={20} color={cfg.color} />
                        </View>
                        <View style={styles.annContent}>
                          <View style={styles.annHeader}>
                            <Text style={styles.annTitle}>{ann.title}</Text>
                            <Pill
                              label={ann.type.charAt(0).toUpperCase() + ann.type.slice(1)}
                              color={cfg.color}
                              backgroundColor={cfg.soft}
                              size="sm"
                            />
                          </View>
                          <Text style={styles.annBody} numberOfLines={2}>
                            {ann.body}
                          </Text>
                          <Text style={styles.annMeta}>
                            {ann.from} · {ann.date}
                          </Text>
                        </View>
                      </View>
                    </Animated.View>
                  );
                })}
              </>
            )}

            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <Text style={styles.sectionLabel}>Recent</Text>
            </Animated.View>
            {rest.map((ann, i) => {
              const cfg = TYPE_CONFIG[ann.type];
              return (
                <Animated.View key={ann.id} entering={FadeInDown.delay(280 + i * 50).springify()}>
                  <View style={styles.annCard}>
                    <View style={[styles.typeIcon, { backgroundColor: cfg.soft }]}>
                      <Ionicons name={cfg.icon as never} size={20} color={cfg.color} />
                    </View>
                    <View style={styles.annContent}>
                      <View style={styles.annHeader}>
                        <Text style={styles.annTitle}>{ann.title}</Text>
                        <Pill
                          label={ann.type.charAt(0).toUpperCase() + ann.type.slice(1)}
                          color={cfg.color}
                          backgroundColor={cfg.soft}
                          size="sm"
                        />
                      </View>
                      <Text style={styles.annBody} numberOfLines={2}>
                        {ann.body}
                      </Text>
                      <Text style={styles.annMeta}>
                        {ann.from} · {ann.date}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>

      {isPrincipal && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setComposeOpen(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={26} color={Colors.white} />
        </TouchableOpacity>
      )}

      <Modal
        visible={composeOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setComposeOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Announcement</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={Colors.inkSoft}
              value={draftTitle}
              onChangeText={setDraftTitle}
            />
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Write a message…"
              placeholderTextColor={Colors.inkSoft}
              value={draftBody}
              onChangeText={setDraftBody}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setComposeOpen(false)} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitAnnouncement}
                style={styles.modalSend}
                disabled={createAnnouncement.isPending}
              >
                <Text style={styles.modalSendText}>
                  {createAnnouncement.isPending ? 'Posting…' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  sectionLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.inkMuted,
    marginBottom: -4,
    marginTop: 4,
  },
  annCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: 14,
    ...Shadows.card,
  },
  pinnedCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.blue,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  annContent: { flex: 1 },
  annHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  annTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.ink,
    flex: 1,
  },
  annBody: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.ink3,
    lineHeight: 20,
    marginBottom: 6,
  },
  annMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.pop,
  },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontFamily: FontFamily.extraBold, fontSize: 20, color: Colors.ink },
  input: {
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.rule,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.ink,
  },
  inputMultiline: { height: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.inkMuted },
  modalSend: {
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
  },
  modalSendText: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.white },
});
