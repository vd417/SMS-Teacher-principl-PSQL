import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { PayslipEntry } from '@/data/domain';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill, Card, TierGate } from '../components';
import { usePayslips } from '@/features/payroll/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCurrentSchoolBranding } from '@/features/auth/useCurrentSchoolBranding';
import { downloadPayslipPdf } from '@/lib/payslipExport';
import { Colors, Radii, Shadows } from '../theme';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNeg = (n: number) => `-${fmt(n)}`;

function payslipBreakdown(p: PayslipEntry): { label: string; value: string }[] {
  const hasComponents =
    (p.basic ?? 0) > 0 ||
    (p.hra ?? 0) > 0 ||
    (p.allowances ?? 0) > 0 ||
    (p.epf ?? 0) > 0 ||
    (p.profTax ?? 0) > 0 ||
    (p.otherDeductions ?? 0) > 0;
  if (hasComponents) {
    const rows: { label: string; value: string }[] = [];
    if ((p.basic ?? 0) > 0) rows.push({ label: 'Basic salary', value: fmt(p.basic ?? 0) });
    if ((p.hra ?? 0) > 0) rows.push({ label: 'HRA', value: fmt(p.hra ?? 0) });
    if ((p.allowances ?? 0) > 0) rows.push({ label: 'Allowances', value: fmt(p.allowances ?? 0) });
    if ((p.epf ?? 0) > 0) rows.push({ label: 'Provident fund', value: fmtNeg(p.epf ?? 0) });
    if ((p.profTax ?? 0) > 0)
      rows.push({ label: 'Professional tax', value: fmtNeg(p.profTax ?? 0) });
    if ((p.otherDeductions ?? 0) > 0)
      rows.push({ label: 'Other deductions', value: fmtNeg(p.otherDeductions ?? 0) });
    return rows;
  }
  return [
    { label: 'Basic salary', value: fmt(p.gross * 0.6) },
    { label: 'HRA', value: fmt(p.gross * 0.2) },
    { label: 'Special allowance', value: fmt(p.gross * 0.1) },
    { label: 'Transport', value: fmt(p.gross * 0.1) },
    { label: 'Provident fund', value: fmtNeg(p.deductions * 0.5) },
    { label: 'Tax deduction', value: fmtNeg(p.deductions * 0.3) },
    { label: 'Insurance', value: fmtNeg(p.deductions * 0.2) },
  ];
}

export const PayslipScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { name: schoolName, logoUrl } = useCurrentSchoolBranding();
  const { data: payslips = [], isLoading, isError, refetch } = usePayslips();

  const latest = payslips[payslips.length - 1];
  const user = session?.user;

  const openPayslipPdf = (entry: PayslipEntry) => {
    if (!user) return;
    downloadPayslipPdf(entry, {
      schoolName,
      employeeName: user.name,
      employeeTitle: user.title,
      periodLabel: `${entry.month} ${entry.year}`,
      status: entry.status,
      logoUrl,
      brandColor: Colors.primary,
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="My Payslip" subtitle="Salary details" showBack />
      </Animated.View>

      <TierGate feature="hr_payroll" title="Payslip locked">
        {isLoading ? (
          <>
            <Skeleton height={160} radius={16} />
            <Skeleton height={200} radius={12} />
          </>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : payslips.length === 0 || !latest ? (
          <EmptyState label="No payslips available" />
        ) : (
          <>
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
                <Text style={styles.heroAmount}>₹{latest.net.toLocaleString('en-IN')}</Text>
                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={() => openPayslipPdf(latest)}
                  accessibilityLabel="Download payslip PDF"
                >
                  <Ionicons name="download-outline" size={18} color={Colors.primary} />
                  <Text style={styles.pdfBtnText}>Download PDF</Text>
                </TouchableOpacity>
                <View style={styles.heroBreakdown}>
                  <View style={styles.heroBreakdownItem}>
                    <Text style={styles.heroBreakdownLabel}>Gross</Text>
                    <Text style={styles.heroBreakdownVal}>
                      ₹{latest.gross.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.heroBreakdownDivider} />
                  <View style={styles.heroBreakdownItem}>
                    <Text style={styles.heroBreakdownLabel}>Deductions</Text>
                    <Text style={styles.heroBreakdownVal}>
                      -₹{latest.deductions.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Details */}
            <Animated.View entering={FadeInDown.delay(160).springify()}>
              <Text style={styles.sectionTitle}>Breakdown</Text>
              <Card padding={0}>
                {payslipBreakdown(latest).map((item, i, arr) => (
                  <View
                    key={item.label}
                    style={[styles.detailRow, i < arr.length - 1 && styles.detailBorder]}
                  >
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        item.value.startsWith('-') && styles.detailValueRed,
                      ]}
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
                <Animated.View key={p.id} entering={FadeInDown.delay(250 + i * 40).springify()}>
                  <View style={styles.historyRow}>
                    <View style={styles.historyMonthBadge}>
                      <Text style={styles.historyMonthText}>{p.month.slice(0, 3)}</Text>
                      <Text style={styles.historyYearText}>{p.year}</Text>
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyNet}>₹{p.net.toLocaleString('en-IN')}</Text>
                      <Text style={styles.historyGross}>
                        Gross ₹{p.gross.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Pill
                      label={p.status === 'paid' ? 'Paid' : 'Pending'}
                      color={p.status === 'paid' ? Colors.present : Colors.late}
                      backgroundColor={p.status === 'paid' ? Colors.presentSoft : Colors.lateSoft}
                      size="sm"
                    />
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => openPayslipPdf(p)}
                      accessibilityLabel={`Download payslip for ${p.month} ${p.year}`}
                    >
                      <Ionicons name="download-outline" size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          </>
        )}
      </TierGate>
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
    marginBottom: 12,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  pdfBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.primary,
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
