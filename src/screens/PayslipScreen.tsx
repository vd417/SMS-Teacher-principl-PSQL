import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill, Card } from '../components';
import { payslips, teacher } from '../data';

export const PayslipScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const latest = payslips[payslips.length - 1];
  const paid = payslips.filter((p) => p.status === 'paid');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="My Payslip" subtitle="Salary details" showBack />
      </Animated.View>

      {/* Latest Payslip Card */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <LinearGradient
          colors={[Colors.primaryDeep, Colors.primary]}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroMonth}>
                {latest.month} {latest.year}
              </Text>
              <Text style={styles.heroLabel}>Net Salary</Text>
            </View>
            <Pill
              label={latest.status === 'paid' ? 'Paid' : 'Pending'}
              color={latest.status === 'paid' ? Colors.present : Colors.late}
              backgroundColor="rgba(255,255,255,0.15)"
            />
          </View>
          <Text style={styles.heroAmount}>${latest.net.toLocaleString()}</Text>
          <View style={styles.heroBreakdown}>
            <View style={styles.heroBreakdownItem}>
              <Text style={styles.heroBreakdownLabel}>Gross</Text>
              <Text style={styles.heroBreakdownVal}>${latest.gross.toLocaleString()}</Text>
            </View>
            <View style={styles.heroBreakdownDivider} />
            <View style={styles.heroBreakdownItem}>
              <Text style={styles.heroBreakdownLabel}>Deductions</Text>
              <Text style={styles.heroBreakdownVal}>-${latest.deductions.toLocaleString()}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Details */}
      <Animated.View entering={FadeInDown.delay(160).springify()}>
        <Text style={styles.sectionTitle}>Breakdown</Text>
        <Card padding={0}>
          {[
            { label: 'Basic Salary', value: `$${(latest.gross * 0.6).toFixed(0)}` },
            { label: 'HRA', value: `$${(latest.gross * 0.2).toFixed(0)}` },
            { label: 'Special Allowance', value: `$${(latest.gross * 0.1).toFixed(0)}` },
            { label: 'Transport', value: `$${(latest.gross * 0.1).toFixed(0)}` },
            { label: 'Provident Fund', value: `-$${(latest.deductions * 0.5).toFixed(0)}` },
            { label: 'Tax Deduction', value: `-$${(latest.deductions * 0.3).toFixed(0)}` },
            { label: 'Insurance', value: `-$${(latest.deductions * 0.2).toFixed(0)}` },
          ].map((item, i, arr) => (
            <View
              key={item.label}
              style={[styles.detailRow, i < arr.length - 1 && styles.detailBorder]}
            >
              <Text style={styles.detailLabel}>{item.label}</Text>
              <Text
                style={[styles.detailValue, item.value.startsWith('-') && styles.detailValueRed]}
              >
                {item.value}
              </Text>
            </View>
          ))}
        </Card>
      </Animated.View>

      {/* History */}
      <Animated.View entering={FadeInDown.delay(220).springify()}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {payslips.map((p, i) => (
          <Animated.View
            key={`${p.month}-${p.year}`}
            entering={FadeInDown.delay(250 + i * 40).springify()}
          >
            <View style={styles.historyRow}>
              <View style={styles.historyMonthBadge}>
                <Text style={styles.historyMonthText}>{p.month.slice(0, 3)}</Text>
                <Text style={styles.historyYearText}>{p.year}</Text>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyNet}>${p.net.toLocaleString()}</Text>
                <Text style={styles.historyGross}>Gross ${p.gross.toLocaleString()}</Text>
              </View>
              <Pill
                label={p.status === 'paid' ? 'Paid' : 'Pending'}
                color={p.status === 'paid' ? Colors.present : Colors.late}
                backgroundColor={p.status === 'paid' ? Colors.presentSoft : Colors.lateSoft}
                size="sm"
              />
              {p.status === 'paid' && (
                <TouchableOpacity style={styles.downloadBtn}>
                  <Ionicons name="download-outline" size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        ))}
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 20 },
  heroCard: {
    borderRadius: Radii.xl,
    padding: 22,
    ...Shadows.pop,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroMonth: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.white },
  heroLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  heroAmount: {
    fontFamily: FontFamily.extraBold,
    fontSize: 40,
    color: Colors.white,
    marginBottom: 20,
  },
  heroBreakdown: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radii.md,
    padding: 14,
  },
  heroBreakdownItem: { flex: 1, alignItems: 'center' },
  heroBreakdownDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroBreakdownLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  heroBreakdownVal: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.white,
    marginTop: 4,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink, marginBottom: -8 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  detailBorder: { borderBottomWidth: 1, borderBottomColor: Colors.ruleSoft },
  detailLabel: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.ink },
  detailValue: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.present },
  detailValueRed: { color: Colors.absent },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
    gap: 10,
  },
  historyMonthBadge: {
    width: 50,
    height: 50,
    borderRadius: Radii.md,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMonthText: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.primary },
  historyYearText: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.inkMuted },
  historyInfo: { flex: 1 },
  historyNet: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.ink },
  historyGross: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
