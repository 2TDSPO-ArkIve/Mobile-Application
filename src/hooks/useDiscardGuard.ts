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
 * Asks before leaving a form whose values changed since it was filled.
 * Call the returned function right before submitting, so the navigation a
 * successful save triggers passes without a prompt.
 *
 * ponytail: dirty is a JSON snapshot compare of `values`; fine for flat form
 * state, swap for per-field compare if a form ever holds large objects.
 */
export function useDiscardGuard(values: unknown, { submitting, ready = true }: Options) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const baseline = useRef<string | null>(null);
  const submitted = useRef(false);

  const current = JSON.stringify(values);
  if (ready && baseline.current === null) baseline.current = current;
  const dirty = baseline.current !== null && current !== baseline.current;

  useEffect(() => {
    if (!submitting) submitted.current = false;
  }, [submitting]);

  usePreventRemove(dirty, ({ data }) => {
    const leave = () => navigation.dispatch(data.action);
    if (submitted.current) {
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

  return () => {
    submitted.current = true;
  };
}
