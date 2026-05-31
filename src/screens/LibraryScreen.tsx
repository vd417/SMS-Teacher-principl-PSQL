import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, Radii, Shadows } from '../theme';
import { FontFamily } from '../theme/typography';
import { ScreenHeader, Pill, SearchField } from '../components';
import { useLibrary } from '@/features/library/hooks';
import { deriveColorSet } from '@/theme/derive';
import { Skeleton } from '@/ui/state/Skeleton';
import { ErrorState } from '@/ui/state/ErrorState';
import { EmptyState } from '@/ui/state/EmptyState';

export const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'issued' | 'overdue'>('all');
  const { data: libraryBooks = [], isLoading, isError, refetch } = useLibrary();

  const filtered = libraryBooks.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || b.status === filter;
    return matchesSearch && matchesFilter;
  });

  const STATUS_COLORS: Record<string, string> = {
    available: Colors.present,
    issued: Colors.blue,
    overdue: Colors.absent,
  };
  const STATUS_SOFT: Record<string, string> = {
    available: Colors.presentSoft,
    issued: Colors.blueSoft,
    overdue: Colors.absentSoft,
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <ScreenHeader title="Library" subtitle={`${libraryBooks.length} books`} showBack />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SearchField placeholder="Search books..." value={search} onChangeText={setSearch} />
      </Animated.View>

      {/* Filters */}
      <Animated.View entering={FadeInDown.delay(140).springify()}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          style={styles.filterRow}
        >
          {['all', 'available', 'issued', 'overdue'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f as typeof filter)}
            >
              <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      {isLoading ? (
        <>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={80} radius={12} />
          ))}
        </>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState label="No books found" />
      ) : (
        filtered.map((book, i) => {
          const cs = deriveColorSet(book.id);
          return (
            <Animated.View key={book.id} entering={FadeInDown.delay(180 + i * 50).springify()}>
              <View style={styles.bookCard}>
                <View style={[styles.bookSpine, { backgroundColor: cs.color }]}>
                  <Ionicons name="book" size={22} color={Colors.white} />
                </View>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>{book.author}</Text>
                  <Text style={styles.bookSubject}>{book.subject}</Text>
                  {book.issuedTo && (
                    <View style={styles.issuedRow}>
                      <Ionicons name="person-outline" size={12} color={Colors.inkMuted} />
                      <Text style={styles.issuedText}>
                        Issued to: {book.issuedTo} · Due: {book.dueDate}
                      </Text>
                    </View>
                  )}
                </View>
                <Pill
                  label={book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                  color={STATUS_COLORS[book.status]}
                  backgroundColor={STATUS_SOFT[book.status]}
                  size="sm"
                />
              </View>
            </Animated.View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  scroll: { paddingHorizontal: 20, gap: 12 },
  filterRow: { marginBottom: 4 },
  filterContent: { gap: 8, paddingRight: 8 },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.card,
    ...Shadows.card,
  },
  filterChipActive: { backgroundColor: Colors.primary },
  filterLabel: { fontFamily: FontFamily.semiBold, fontSize: 13, color: Colors.inkMuted },
  filterLabelActive: { color: Colors.white },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  bookSpine: {
    width: 60,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: { flex: 1, padding: 14 },
  bookTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.ink, marginBottom: 3 },
  bookAuthor: { fontFamily: FontFamily.regular, fontSize: 13, color: Colors.inkMuted },
  bookSubject: { fontFamily: FontFamily.medium, fontSize: 12, color: Colors.ink3, marginTop: 2 },
  issuedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  issuedText: { fontFamily: FontFamily.regular, fontSize: 11, color: Colors.inkMuted },
});
