import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill } from '../components';
import { announcements } from '../data';
import type { AnnouncementType } from '../types';

const TYPE_CONFIG: Record<AnnouncementType, { color: string; soft: string; icon: string }> = {
  info: { color: Colors.blue, soft: Colors.blueSoft, icon: 'information-circle' },
  warning: { color: Colors.late, soft: Colors.lateSoft, icon: 'warning' },
  event: { color: Colors.present, soft: Colors.presentSoft, icon: 'calendar' },
  urgent: { color: Colors.absent, soft: Colors.absentSoft, icon: 'alert-circle' },
};

export const AnnouncementsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const pinned = announcements.filter((a) => a.pinned);
  const rest = announcements.filter((a) => !a.pinned);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Announcements" subtitle={`${announcements.length} total`} showBack />
      </Animated.View>

      {pinned.length > 0 && (
        <>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text style={styles.sectionLabel}>📌 Pinned</Text>
          </Animated.View>
          {pinned.map((ann, i) => {
            const cfg = TYPE_CONFIG[ann.type];
            return (
              <Animated.View key={ann.id} entering={FadeInDown.delay(130 + i * 50).springify()}>
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
    </ScrollView>
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
});
