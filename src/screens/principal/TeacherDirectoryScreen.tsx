import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { Avatar } from '../../components';
import { usePrincipalOverview } from '@/features/principal/hooks';

export const TeacherDirectoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { data: overview } = usePrincipalOverview();
  const staff = overview?.staff ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Teachers</Text>
        <Text style={styles.sub}>{staff.length} staff</Text>

        {staff.map((s, i) => (
          <Animated.View
            key={s.teacherId}
            entering={FadeInDown.delay(50 * i).springify()}
            style={styles.row}
          >
            <Avatar initials={s.initials} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.meta}>{s.subject}</Text>
            </View>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: s.checkedIn ? Colors.present : Colors.absent },
              ]}
            />
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => Linking.openURL(`tel:${s.phone}`)}
            >
              <Ionicons name="call-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper2 },
  scroll: { paddingHorizontal: 20 },
  h1: { fontFamily: FontFamily.extraBold, fontSize: 26, color: Colors.ink },
  sub: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.inkMuted, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.lg,
    padding: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  name: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
