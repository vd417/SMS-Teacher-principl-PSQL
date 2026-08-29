import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Radii } from '../../theme';
import { FontFamily } from '../../theme/typography';
import { deriveGradeColorSet, deriveColorSet } from '@/theme/derive';
import { sectionLabel } from '@/lib/classLabel';
import type { ClassHubGrade } from '@/features/classHub/useClassHubSelection';

export interface ClassSectionBarProps {
  grades: ClassHubGrade[];
  gradeKey: string;
  sectionId: string;
  onSelectGrade: (key: string) => void;
  onSelectSection: (id: string) => void;
  /** Light chips for gradient hero backgrounds */
  variant?: 'default' | 'onDark';
}

export const ClassSectionBar: React.FC<ClassSectionBarProps> = ({
  grades,
  gradeKey,
  sectionId,
  onSelectGrade,
  onSelectSection,
  variant = 'default',
}) => {
  const onDark = variant === 'onDark';
  const currentGrade = grades.find((g) => g.key === gradeKey);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gradeRow}
      >
        {grades.map((g) => {
          const cs = deriveGradeColorSet(g.key);
          const active = g.key === gradeKey;
          return (
            <TouchableOpacity
              key={g.key}
              style={[
                styles.gradeChip,
                onDark && styles.gradeChipDark,
                {
                  borderColor: active
                    ? onDark
                      ? '#fff'
                      : cs.color
                    : onDark
                      ? 'rgba(255,255,255,0.35)'
                      : Colors.rule,
                },
                active && (onDark ? styles.gradeChipDarkActive : { backgroundColor: cs.colorSoft }),
              ]}
              onPress={() => onSelectGrade(g.key)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.gradeText,
                  {
                    color: active
                      ? onDark
                        ? '#fff'
                        : cs.color
                      : onDark
                        ? 'rgba(255,255,255,0.75)'
                        : Colors.inkMuted,
                  },
                ]}
                numberOfLines={1}
              >
                {g.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {currentGrade && currentGrade.sections.length > 0 ? (
        <View style={styles.sectionRow}>
          {currentGrade.sections.map((sec) => {
            const cs = deriveColorSet(sec.id);
            const active = sec.id === sectionId;
            return (
              <TouchableOpacity
                key={sec.id}
                style={[
                  styles.sectionChip,
                  onDark && styles.sectionChipDark,
                  {
                    borderColor: active
                      ? onDark
                        ? '#fff'
                        : cs.color
                      : onDark
                        ? 'rgba(255,255,255,0.35)'
                        : Colors.rule,
                  },
                  active && (onDark ? { backgroundColor: '#fff' } : { backgroundColor: cs.color }),
                ]}
                onPress={() => onSelectSection(sec.id)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.sectionText,
                    {
                      color: active
                        ? onDark
                          ? cs.color
                          : '#fff'
                        : onDark
                          ? 'rgba(255,255,255,0.9)'
                          : Colors.ink,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {sectionLabel(sec.section).replace(/^Section\s+/i, '')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  gradeRow: { gap: 8, paddingHorizontal: 2 },
  gradeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    backgroundColor: Colors.card,
  },
  gradeText: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  gradeChipDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  gradeChipDarkActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  sectionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    backgroundColor: Colors.card,
    minWidth: 44,
    alignItems: 'center',
  },
  sectionChipDark: { backgroundColor: 'rgba(255,255,255,0.12)' },
  sectionText: { fontFamily: FontFamily.semiBold, fontSize: 13 },
});
