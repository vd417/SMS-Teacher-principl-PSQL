import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radii, Shadows } from '../../theme';
import { FontFamily } from '../../theme/typography';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ScreenHeader, TeacherSubjectDrawer, SearchField } from '../../components';
import { StaffListContactActions } from '@/components/staff/StaffListContactActions';
import { usePrincipalAttendance } from '@/features/principal/hooks';
import { formatLongDate, parseISO, todayISO } from '@/lib/date';
import { splitStaffByCategory, staffDisplayLabel } from '@/lib/staffCategory';
import { filterStaffBySearch } from '@/lib/staffSearch';
import { staffCheckInStatus } from '@/lib/staffCheckIn';
import { useFeature } from '@/features/plan/hooks';
import { TIER_META } from '@/lib/gating';
import type { PrincipalHomeStackParamList } from '../../navigation/types';

type StaffAttendanceNav = NativeStackNavigationProp<
  PrincipalHomeStackParamList,
  'StaffAttendanceScreen'
>;

export const StaffAttendanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StaffAttendanceNav>();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const { data, isLoading, isError } = usePrincipalAttendance(selectedDate);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [staffView, setStaffView] = useState<'teaching' | 'support' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const geofence = useFeature('attendance.geofence');

  const allStaff = data?.staff ?? [];
  const { teaching: teachingStaff, nonTeaching: supportStaff } = splitStaffByCategory(allStaff);
  const presentCount = (list: typeof allStaff) => list.filter((s) => s.checkedIn).length;

  const filteredTeachingStaff = useMemo(
    () => filterStaffBySearch(teachingStaff, searchQuery),
    [teachingStaff, searchQuery]
  );
  const filteredSupportStaff = useMemo(
    () => filterStaffBySearch(supportStaff, searchQuery),
    [supportStaff, searchQuery]
  );

  const isSearching = searchQuery.trim().length > 0;
  const hasStaffMatches = filteredTeachingStaff.length > 0 || filteredSupportStaff.length > 0;
  const showStaffInline = isSearching && hasStaffMatches;
  const showStaffCategoryCards = !isSearching && allStaff.length > 0;
  const showNoSearchResults = isSearching && !hasStaffMatches;

  const inlineStaffMatches = useMemo(
    () =>
      isSearching
        ? [
            ...filteredTeachingStaff.map((member) => ({
              ...member,
              category: 'teaching' as const,
            })),
            ...filteredSupportStaff.map((member) => ({
              ...member,
              category: 'support' as const,
            })),
          ]
        : [],
    [isSearching, filteredTeachingStaff, filteredSupportStaff]
  );

  const dateLabel = data?.date ? formatLongDate(data.date) : 'Today';

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <ScreenHeader
            title="Staff Attendance"
            subtitle="Teachers & non-teaching staff"
            showBack
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.dateRow}>
          <Pressable
            style={styles.dateRowPress}
            onPress={() => setShowDatePicker(true)}
            accessibilityLabel="Change date"
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.inkMuted} />
            <Text style={styles.dateText}>{dateLabel}</Text>
          </Pressable>
          {selectedDate !== todayISO() ? (
            <Pressable onPress={() => setSelectedDate(todayISO())}>
              <Text style={styles.todayLink}>Today</Text>
            </Pressable>
          ) : null}
          {showDatePicker ? (
            <DateTimePicker
              value={parseISO(selectedDate)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(_e: DateTimePickerEvent, picked?: Date) => {
                if (Platform.OS === 'android') setShowDatePicker(false);
                if (picked) setSelectedDate(todayISO(picked));
              }}
            />
          ) : null}
          {Platform.OS === 'ios' && showDatePicker ? (
            <Pressable onPress={() => setShowDatePicker(false)} style={styles.datePickerDone}>
              <Text style={styles.todayLink}>Done</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {isError ? (
          <Text style={styles.emptyFilter}>Failed to load attendance. Please try again.</Text>
        ) : isLoading || !data ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify()} style={styles.totalCard}>
              <Text style={styles.totalPct}>{presentCount(allStaff)}</Text>
              <View style={styles.totalMeta}>
                <Text style={styles.totalLabel}>Staff checked in today</Text>
                <Text style={styles.totalCount}>{allStaff.length} total staff</Text>
              </View>
            </Animated.View>

            {!geofence.allowed && (
              <View style={styles.geoBanner}>
                <Ionicons name="information-circle-outline" size={16} color={Colors.inkMuted} />
                <Text style={styles.geoBannerText}>
                  Staff GPS check-in details require the {TIER_META.platinum.label} plan. Checked-in
                  status may be hidden on your current plan.
                </Text>
              </View>
            )}

            <View style={styles.searchWrap}>
              <SearchField
                placeholder="Search staff by name, subject, or role..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {showNoSearchResults && <Text style={styles.emptyFilter}>No matching staff</Text>}

            {showStaffInline &&
              inlineStaffMatches.map((member) => {
                const status = staffCheckInStatus(member);
                return (
                  <View key={member.teacherId} style={styles.staffMatchRow}>
                    <Pressable
                      style={styles.staffMatchTop}
                      onPress={() =>
                        navigation.navigate('StaffAttendanceHistoryScreen', {
                          personId: member.teacherId,
                          name: member.name,
                        })
                      }
                    >
                      <View
                        style={[
                          styles.staffMatchIcon,
                          {
                            backgroundColor:
                              member.category === 'teaching' ? Colors.primary : Colors.teal,
                          },
                        ]}
                      >
                        <Text style={styles.staffMatchInitials}>{member.initials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.staffMatchName}>{member.name}</Text>
                        <Text style={styles.staffMatchMeta}>
                          {member.category === 'teaching' ? 'Teaching' : 'Non-teaching'}
                          {' · '}
                          {member.category === 'teaching' && member.subject
                            ? member.subject
                            : staffDisplayLabel(member)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.staffMatchStatus,
                          {
                            backgroundColor: member.checkedIn
                              ? status.flagged
                                ? Colors.lateSoft
                                : Colors.presentSoft
                              : Colors.paper2,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.staffMatchStatusText,
                            {
                              color: member.checkedIn
                                ? status.flagged
                                  ? Colors.late
                                  : Colors.present
                                : Colors.inkMuted,
                            },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.staffMatchActions}>
                      <Pressable
                        style={styles.historyLink}
                        onPress={() =>
                          navigation.navigate('StaffAttendanceHistoryScreen', {
                            personId: member.teacherId,
                            name: member.name,
                          })
                        }
                        accessibilityLabel={`View ${member.name}'s attendance history`}
                      >
                        <Text style={styles.historyLinkText}>History</Text>
                        <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
                      </Pressable>
                      <StaffListContactActions
                        name={member.name}
                        roleLabel={staffDisplayLabel(member)}
                        phone={member.phone}
                      />
                    </View>
                  </View>
                );
              })}

            {showStaffCategoryCards && teachingStaff.length > 0 && (
              <Animated.View entering={FadeInDown.springify()}>
                <TouchableOpacity
                  style={styles.staffCard}
                  activeOpacity={0.88}
                  onPress={() => setStaffView('teaching')}
                >
                  <View style={[styles.staffIcon, { backgroundColor: Colors.primary }]}>
                    <Ionicons name="school" size={18} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffCardTitle}>Teaching staff</Text>
                    <Text style={styles.staffCardMeta}>
                      {presentCount(teachingStaff)}/{teachingStaff.length} checked in
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                </TouchableOpacity>
              </Animated.View>
            )}
            {showStaffCategoryCards && supportStaff.length > 0 && (
              <Animated.View entering={FadeInDown.delay(60).springify()}>
                <TouchableOpacity
                  style={styles.staffCard}
                  activeOpacity={0.88}
                  onPress={() => setStaffView('support')}
                >
                  <View style={[styles.staffIcon, { backgroundColor: Colors.teal }]}>
                    <Ionicons name="people" size={18} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffCardTitle}>Non-teaching staff</Text>
                    <Text style={styles.staffCardMeta}>
                      {presentCount(supportStaff)}/{supportStaff.length} checked in
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.inkSoft} />
                </TouchableOpacity>
              </Animated.View>
            )}
            {!isLoading && allStaff.length === 0 && (
              <Text style={styles.emptyFilter}>No staff configured for this school yet.</Text>
            )}
          </>
        )}
      </ScrollView>

      <TeacherSubjectDrawer
        visible={staffView !== null}
        title={staffView === 'support' ? 'Non-teaching staff' : 'Teaching staff'}
        staff={staffView === 'support' ? supportStaff : teachingStaff}
        initialSearch={searchQuery}
        onClose={() => setStaffView(null)}
        onPressTeacher={(t) => {
          setStaffView(null);
          navigation.navigate('StaffAttendanceHistoryScreen', {
            personId: t.teacherId,
            name: t.name,
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.paper },
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 10 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 2,
    marginBottom: 2,
  },
  dateRowPress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayLink: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.primary },
  datePickerDone: { paddingVertical: 4, paddingHorizontal: 4 },
  dateText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.inkMuted,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    padding: 20,
    marginBottom: 8,
    ...Shadows.card,
  },
  geoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.paper2,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 4,
  },
  geoBannerText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    lineHeight: 17,
  },
  totalPct: { fontFamily: FontFamily.extraBold, fontSize: 40, color: Colors.white },
  totalMeta: { flex: 1, gap: 4 },
  totalCount: { fontFamily: FontFamily.semiBold, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  totalLabel: { fontFamily: FontFamily.medium, fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  searchWrap: { marginBottom: 8 },
  emptyFilter: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.inkMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 14,
    marginBottom: 8,
    ...Shadows.card,
  },
  staffIcon: {
    width: 42,
    height: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffCardTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink },
  staffCardMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  staffMatchRow: {
    backgroundColor: Colors.white,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  staffMatchTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffMatchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingRight: 8,
  },
  historyLinkText: { fontFamily: FontFamily.semiBold, fontSize: 12, color: Colors.primary },
  staffMatchIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffMatchInitials: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.white,
  },
  staffMatchName: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.ink },
  staffMatchMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.inkMuted,
    marginTop: 2,
  },
  staffMatchStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  staffMatchStatusText: { fontFamily: FontFamily.bold, fontSize: 12 },
});
