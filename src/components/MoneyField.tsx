import React from 'react';
import { AppInput } from './AppInput';

interface Props {
  /** Omit when a section heading above already names the field. */
  label?: string;
  helperText?: string;
  error?: string;
  value: string;
  onChangeText: (value: string) => void;
  editable?: boolean;
}

/**
 * A plain decimal text field for an optional monetary amount (consultation
 * cost, prescription treatment cost) — NOT currency-formatted while typing
 * (no "R$" prefix, no auto-inserted thousands separators, no live masking).
 * The only keystroke filtering is dropping anything that isn't a digit, `,`
 * or `.` — so a `-` (or a letter typed on a desktop keyboard) never enters
 * the field. Format rules stay in `parseMoneyInput` (see `utils/money.ts`),
 * which still rejects negatives as a second barrier. Otherwise just
 * `AppInput` pinned to a numeric keyboard, shared so the three call
 * sites (NewConsultaScreen, EditConsultaScreen, PrescricaoForm) don't each
 * redeclare the same `keyboardType`/`inputMode`.
 */
export function MoneyField({ label, helperText, error, value, onChangeText, editable }: Props) {
  return (
    <AppInput
      label={label}
      helperText={helperText}
      error={error}
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/[^\d.,]/g, ''))}
      editable={editable}
      placeholder="0,00"
      keyboardType="decimal-pad"
      inputMode="decimal"
    />
  );
}
