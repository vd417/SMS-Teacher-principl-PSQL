import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card } from '../components';

const SETTINGS_SECTIONS = [
  {
    title: 'Notifications',
    items: [
      { label: 'Push Notifications', type: 'toggle', value: true },
      { label: 'Email Alerts', type: 'toggle', value: false },
      { label: 'SMS Alerts', type: 'toggle', value: true },
      { label: 'Attendance Reminders', type: 'toggle', value: true },
    ],
  },
  {
    title: 'Appearance',
    items: [
      { label: 'Dark Mode', type: 'toggle', value: false },
      { label: 'Font Size', type: 'link', value: 'Medium' },
      { label: 'Language', type: 'link', value: 'English' },
    ],
  },
  {
    title: 'Privacy',
    items: [
      { label: 'Two-Factor Authentication', type: 'toggle', value: false },
      { label: 'Biometric Login', type: 'toggle', value: true },
      { label: 'Change Password', type: 'link', value: null },
    ],
  },
  {
    title: 'About',
    items: [
      { label: 'App Version', type: 'info', value: '1.0.0' },
      { label: 'School', type: 'info', value: 'Westbrook Academy' },
      { label: 'Terms of Service', type: 'link', value: null },
      { label: 'Privacy Policy', type: 'link', value: null },
    ],
  },
];

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Settings" showBack />
      </Animated.View>

      {SETTINGS_SECTIONS.map((section, si) => (
        <Animated.View
          key={section.title}
          entering={FadeInDown.delay(100 + si * 80).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card padding={0}>
            {section.items.map((item, ii) => (
              <View
                key={item.label}
                style={[styles.settingRow, ii < section.items.length - 1 && styles.settingBorder]}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.type === 'toggle' ? (
                  <Switch
                    value={item.value as boolean}
                    trackColor={{ true: Colors.primary, false: Colors.rule }}
                    thumbColor={Colors.white}
                  />
                ) : item.type === 'link' ? (
                  <View style={styles.linkRow}>
                    {item.value && <Text style={styles.linkValue}>{item.value}</Text>}
                    <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{item.value}</Text>
                )}
              </View>
            ))}
          </Card>
        </Animated.View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 4 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.inkMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: Colors.ruleSoft },
  settingLabel: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.ink },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkValue: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
  infoValue: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.inkMuted },
});
