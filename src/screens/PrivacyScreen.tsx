import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card } from '../components';
import { useAuth } from '@/features/auth/AuthProvider';

export const PrivacyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const school = session?.tenant.name?.trim() || 'your school';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
    >
      <ScreenHeader title="Privacy & Security" showBack />
      <Card style={styles.card}>
        <Text style={styles.body}>
          CatreSchoolDesk keeps your {school} session on this device using secure storage. Only sign
          in with credentials issued by your school. Do not share your password or verification
          codes.
        </Text>
        <Text style={styles.body}>
          Change your password from Me → Change Password. Sign out on a shared device when you are
          finished. School data stays within your school account and is not mixed with other
          tenants.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 16 },
  card: { padding: 16, borderRadius: Radii.lg, ...Shadows.card },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.ink3,
    lineHeight: 20,
    marginBottom: 12,
  },
});
