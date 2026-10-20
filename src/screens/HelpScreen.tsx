import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Card } from '../components';
import { useAuth } from '@/features/auth/AuthProvider';

export const HelpScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const school = session?.tenant.name?.trim() || 'your school office';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
    >
      <ScreenHeader title="Help & Support" showBack />
      <Card style={styles.card}>
        <Text style={styles.title}>CatreSchoolDesk Teacher App</Text>
        <Text style={styles.body}>
          Use Home for daily work, Inbox for parent conversations, and Me for attendance, leave, and
          account settings.
        </Text>
        <Text style={styles.body}>
          If a feature is locked, your school plan does not include it. For login, timetable, or
          student data issues, contact {school}.
        </Text>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 16 },
  card: { padding: 16, borderRadius: Radii.lg, ...Shadows.card },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.ink3,
    lineHeight: 20,
    marginBottom: 12,
  },
});
