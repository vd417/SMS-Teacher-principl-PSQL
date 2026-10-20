import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card } from '../components';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/features/auth/AuthProvider';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const schoolName = session?.tenant.name?.trim() || 'Not assigned';

  const settingsSections = [
    {
      title: 'About',
      items: [
        { label: 'App', type: 'info' as const, value: 'CatreSchoolDesk Teacher' },
        { label: 'App Version', type: 'info' as const, value: '1.0.0' },
        { label: 'School', type: 'info' as const, value: schoolName },
        {
          label: 'Change Password',
          type: 'link' as const,
          value: null,
          screen: 'ChangePasswordScreen',
        },
        {
          label: 'Privacy & Security',
          type: 'link' as const,
          value: null,
          screen: 'PrivacyScreen',
        },
        { label: 'Help & Support', type: 'link' as const, value: null, screen: 'HelpScreen' },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Settings" showBack />
      </Animated.View>

      {settingsSections.map((section, si) => (
        <Animated.View
          key={section.title}
          entering={FadeInDown.delay(100 + si * 80).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card padding={0}>
            {section.items.map((item, ii) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.settingRow, ii < section.items.length - 1 && styles.settingBorder]}
                disabled={item.type !== 'link'}
                onPress={() => item.screen && navigation.navigate(item.screen)}
              >
                <Text style={styles.settingLabel}>{item.label}</Text>
                {item.type === 'link' ? (
                  <View style={styles.linkRow}>
                    {item.value && <Text style={styles.linkValue}>{item.value}</Text>}
                    <Ionicons name="chevron-forward" size={16} color={Colors.inkSoft} />
                  </View>
                ) : (
                  <Text style={styles.infoValue}>{item.value}</Text>
                )}
              </TouchableOpacity>
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
