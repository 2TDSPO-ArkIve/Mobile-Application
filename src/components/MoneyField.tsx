import React from 'react';
import { AppInput } from './AppInput';

interface Props {
  label: string;
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
 * Reformatting on every keystroke is exactly the complexity the product
 * explicitly didn't ask for; the raw text is only parsed/validated at submit
 * time via `parseMoneyInput` (see `utils/money.ts`). Purely presentational —
 * just `AppInput` pinned to a numeric keyboard, shared so the three call
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
      onChangeText={onChangeText}
      editable={editable}
      placeholder="0,00"
      keyboardType="decimal-pad"
      inputMode="decimal"
    />
  );
}
