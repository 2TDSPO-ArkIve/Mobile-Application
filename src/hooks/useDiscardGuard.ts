import { useEffect, useRef } from 'react';
import { useNavigation, usePreventRemove } from '@react-navigation/native';
import { useTranslation } from '../i18n/useTranslation';
import { confirmAction } from '../utils/dialog';

interface Options {
  /** True while the save request runs; a failed save re-arms the guard when it flips back. */
  submitting: boolean;
  /** For forms filled after mount (edit screens): the baseline is taken on the first ready render. */
  ready?: boolean;
}

/**
 * Asks before leaving the screen while `dirty`. `passThrough` lets a
 * navigation through without the prompt (the one a successful save triggers).
 * For components that already track their own unsaved state; forms use
 * `useDiscardGuard` below.
 */
export function useLeaveGuard(dirty: boolean, passThrough?: () => boolean) {
  const navigation = useNavigation();
  const { t } = useTranslation();

  usePreventRemove(dirty, ({ data }) => {
    const leave = () => navigation.dispatch(data.action);
    if (passThrough?.()) {
      leave();
      return;
    }
    confirmAction({
      title: t('common.discardTitle'),
      message: t('common.discardMessage'),
      confirmText: t('common.discard'),
      cancelText: t('common.keepEditing'),
      destructive: true,
      onConfirm: leave,
    });
  });
}

/**
 * Asks before leaving a form whose values changed since it was filled.
 * Call the returned function right before submitting, so the navigation a
 * successful save triggers passes without a prompt.
 *
 * ponytail: dirty is a JSON snapshot compare of `values`; fine for flat form
 * state, swap for per-field compare if a form ever holds large objects.
 */
export function useDiscardGuard(values: unknown, { submitting, ready = true }: Options) {
  const baseline = useRef<string | null>(null);
  const submitted = useRef(false);

  const current = JSON.stringify(values);
  if (ready && baseline.current === null) baseline.current = current;
  const dirty = baseline.current !== null && current !== baseline.current;

  useEffect(() => {
    if (!submitting) submitted.current = false;
  }, [submitting]);

  useLeaveGuard(dirty, () => submitted.current);

  return () => {
    submitted.current = true;
  };
}
