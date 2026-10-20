import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useThemeColors } from '../hooks/useThemeColors';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from '../i18n/useTranslation';
import { spacing, radius, fontSize, font } from '../styles/theme';
import { commonStyles } from '../styles/common';
import { CalendarGlyph } from './CalendarGlyph';
import { formatDate } from '../utils/localeFormat';

interface Props {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  error?: string;
  /** Earliest selectable date (e.g. "today" for scheduling a consultation). */
  minimumDate?: Date;
  /** Latest selectable date (e.g. "today" for a birth date — never future). */
  maximumDate?: Date;
  /** Renders a small clear affordance next to the field when `value` is set — for an optional, clearable date like a patient's birth date. */
  onClear?: () => void;
}

/**
 * Android uses the library's own recommended imperative dialog
 * (`DateTimePickerAndroid.open`) — a native window, nothing in our tree to
 * lay out or squish.
 *
 * iOS has no such system-level modal for an embedded `display="spinner"`
 * picker, so it's presented in our own bottom-sheet `Modal` — rendered in
 * its own native layer, immune to the surrounding ScrollView's layout.
 * Spinning the wheel updates a local `draft` only; the parent's `value`
 * (and therefore the picker's own `value` prop) is updated once, on
 * "Concluído" — feeding the live external `value` straight back into the
 * picker on every spin previously fought the wheel's own scroll state and
 * is what made the picker feel unresponsive/"broken".
 *
 * `onChange` (the library prop) is deliberately never used — it's
 * deprecated in the installed 9.1.0 typings in favor of
 * `onValueChange`/`onDismiss`.
 */
export function DateField({ label, value, onChange, error, minimumDate, maximumDate, onClear }: Props) {
  const colors = useThemeColors();
  const { mode } = useTheme();
  const { t, language } = useTranslation();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? minimumDate ?? new Date());

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? minimumDate ?? new Date(),
        mode: 'date',
        minimumDate,
        maximumDate,
        onValueChange: (_event, selected) => onChange(selected),
      });
      return;
    }
    setDraft(value ?? minimumDate ?? new Date());
    setIosOpen(true);
  };

  const confirm = () => {
    onChange(draft);
    setIosOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[commonStyles.label, { color: colors.text }]}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.line },
        ]}
      >
        <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: fontSize.md }}>
          {value ? formatDate(value) : t('date.datePlaceholder')}
        </Text>
        <CalendarGlyph color={colors.primary} />
      </Pressable>
      {value && onClear ? (
        <Pressable onPress={onClear} style={styles.clearBtn} accessibilityRole="button">
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('common.clearDate')}</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={[commonStyles.errorText, { color: colors.error }]}>{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIosOpen(false)} />
            <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
                <Pressable onPress={() => setIosOpen(false)}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>{t('date.pickerCancel')}</Text>
                </Pressable>
                <Pressable onPress={confirm}>
                  <Text style={{ color: colors.primary, ...font('bold'), fontSize: fontSize.sm }}>
                    {t('date.pickerDone')}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                locale={language}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant={mode === 'dark' ? 'dark' : 'light'}
                textColor={colors.text}
                style={styles.picker}
                onValueChange={(_event, selected) => setDraft(selected)}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  clearBtn: { alignSelf: 'flex-start', marginTop: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
  },
  // The backdrop MUST be position:'absolute' (removed from flex flow), not
  // flex:1 — a flex:1 sibling in Modal's column layout consumes all
  // available height before `sheet` gets any, so the picker rendered at
  // zero height and never showed a single wheel/number.
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  // `themeVariant`/`textColor` alone don't help if the picker has no room —
  // explicit height matches iOS's own intrinsic spinner height instead of
  // relying on it to self-report a size inside a Modal-nested sheet.
  picker: { width: '100%', height: 216 },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
});
