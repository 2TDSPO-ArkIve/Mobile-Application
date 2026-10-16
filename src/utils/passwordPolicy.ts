/**
 * Mirrors `PasswordPolicy.java` exactly — minimum 8, maximum 72, at least
 * one uppercase, one lowercase, one digit. No special-character requirement
 * exists server-side, so none is invented here. Shared between the
 * submit-time validation gate and the live checklist UI (`PasswordChecklist`)
 * so the two can never silently drift apart.
 */
export interface PasswordRule {
  key: 'length' | 'upper' | 'lower' | 'digit';
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: 'length', test: (password) => password.length >= 8 && password.length <= 72 },
  { key: 'upper', test: (password) => /[A-Z]/.test(password) },
  { key: 'lower', test: (password) => /[a-z]/.test(password) },
  { key: 'digit', test: (password) => /\d/.test(password) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
