import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Radii } from '@/theme';
import { FontFamily } from '@/theme/typography';

function parseYmd(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  return new Date();
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type Props = {
  value: string;
  onChange: (ymd: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: boolean;
};

export const DatePickerField: React.FC<Props> = ({
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  error,
}) => {
  const [show, setShow] = useState(false);
  const date = value ? parseYmd(value) : new Date();

  const onPickerChange = (_e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(formatYmd(selected));
  };

  return (
    <View>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.field, error && styles.fieldError]}
        accessibilityRole="button"
      >
        <Text style={[styles.text, !value && styles.placeholder]}>{value || placeholder}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={onPickerChange}
        />
      ) : null}
      {Platform.OS === 'ios' && show ? (
        <Pressable onPress={() => setShow(false)} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  field: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.rule,
  },
  fieldError: { borderColor: Colors.absent },
  text: { fontFamily: FontFamily.regular, fontSize: 15, color: Colors.ink },
  placeholder: { color: Colors.inkSoft },
  done: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 4 },
  doneText: { fontFamily: FontFamily.semiBold, fontSize: 14, color: Colors.primary },
});
